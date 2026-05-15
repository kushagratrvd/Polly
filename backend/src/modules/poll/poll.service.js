import { Poll, Question, Vote } from "./poll.model.js";
import ApiError from "../../common/utils/api-error.js";
import { getIO } from "../../common/config/socket-io.js";
import mongoose from "mongoose";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const toId = (value) => value?.toString();

const getPolls = async (req) => {
  const polls = await Poll.find();
  return polls;
};

const getPollById = async (pollId) => {
  if (!mongoose.Types.ObjectId.isValid(pollId)) {
    throw ApiError.badRequest("Invalid poll id");
  }

  const poll = await Poll.findById(pollId).lean();
  if(!poll) throw ApiError.notFound("Poll not found");

  const questions = await Question.find({ poll: pollId }).lean();

  poll.questions = questions;

  return poll;
}

const getMyPolls = async (userId) => {
  const polls = await Poll.find({ author: userId });
  if(!polls) throw ApiError.notFound("Polls not found");
  return polls;
}

const getMyVotedPolls = async (userId) => {
  const votes = await Vote.find({ user: userId })
    .populate("poll")
    .lean();

  if(!votes) ApiError.notfound("No voted polls found");

  const votedPolls = votes
    .filter(vote => vote.poll !== null)
    .map(vote => vote.poll);

  return votedPolls;
}

const createPoll = async ({ title, author, questions, responseMode, expiresAt }) => {
  const poll = await Poll.create({
    title,
    author,
    responseMode,
    expiresAt,
  });

  if(questions && questions.length > 0) {
    const questionsWithPollId = questions.map(question => ({
      ...question,
      poll: poll._id
    }));

    await Question.insertMany(questionsWithPollId);
  }

  return poll;
}

const publishPoll = async (pollId, userId) => {
  if (!isValidObjectId(pollId)) {
    throw ApiError.badRequest("Invalid poll id");
  }

  const poll = await Poll.findById(pollId);
  if (!poll) {
    throw ApiError.notFound("Poll not found");
  }

  if (toId(poll.author) !== toId(userId)) {
    throw ApiError.forbidden("Only the poll creator can publish results");
  }

  if (!poll.isPublished) {
    poll.isPublished = true;
    poll.publishedAt = new Date();
    await poll.save();
  }

  const io = getIO();
  io.to(pollId).emit("poll-published", {
    pollId,
    publishedAt: poll.publishedAt,
  });
  io.to("analytics").emit("poll-published", {
    pollId,
    publishedAt: poll.publishedAt,
  });

  return getPollById(pollId);
}

const submitPoll = async ({ pollId, selected, userId }) => {

  try {
    console.log("[poll] submitting vote", {
      pollId,
      voter: userId ? userId.toString() : "anonymous",
      selections: Array.isArray(selected) ? selected.length : 0,
    });

    if (!isValidObjectId(pollId)) {
      throw ApiError.badRequest("Invalid poll id");
    }

    if (!Array.isArray(selected)) {
      throw ApiError.badRequest("Selected answers must be an array");
    }

    const poll = await Poll.findById(pollId).lean();
    if (!poll) {
      throw ApiError.notFound("Poll not found");
    }

    if (poll.isPublished) {
      throw ApiError.badRequest("Poll results are already published");
    }

    if (poll.expiresAt && new Date(poll.expiresAt) <= new Date()) {
      throw ApiError.badRequest("Poll has expired");
    }

    if (poll.responseMode === "authenticated" && !userId) {
      throw ApiError.unauthorized("Sign in to vote on this poll");
    }

    // If the requester is authenticated, associate the vote with their user id.
    // This prevents logged-in users from voting multiple times even on anonymous polls.
    const voterId = userId ? userId : undefined;

    if (voterId) {
      const existingVote = await Vote.findOne({ poll: pollId, user: voterId }).lean();
      if (existingVote) {
        throw ApiError.conflict("You have already voted on this poll");
      }
    }

    const questions = await Question.find({ poll: pollId }).lean();
    if (!questions.length) {
      throw ApiError.badRequest("Poll has no questions");
    }

    const questionMap = new Map(
      questions.map((question) => [toId(question._id), question]),
    );
    const selectedByQuestion = new Map();

    for (const selection of selected) {
      if (!isValidObjectId(selection.question) || !isValidObjectId(selection.option)) {
        throw ApiError.badRequest("Invalid answer selection");
      }

      if (selectedByQuestion.has(selection.question)) {
        throw ApiError.badRequest("Each question can only have one selected option");
      }

      const question = questionMap.get(selection.question);
      if (!question) {
        throw ApiError.badRequest("Selected question does not belong to this poll");
      }

      const optionExists = (question.options || []).some((option) =>
        toId(option._id) === selection.option,
      );

      if (!optionExists) {
        throw ApiError.badRequest("Selected option does not belong to this question");
      }

      selectedByQuestion.set(selection.question, selection.option);
    }

    const missingRequired = questions.find(
      (question) => !question.optional && !selectedByQuestion.has(toId(question._id)),
    );

    if (missingRequired) {
      throw ApiError.badRequest(`Required question missing: ${missingRequired.text}`);
    }

    const vote = await Vote.create({
      poll: pollId,
      user: voterId,
      selected,
    });

    const updatedPoll = await Poll.findByIdAndUpdate(
      pollId, 
      { $inc: { voteCount: 1 } },
      { returnDocument: "after" }
    );

    const io = getIO();

    io.to(pollId).emit("poll-total-updated", {
      pollId: pollId,
      newTotalVotes: updatedPoll.voteCount
    });
    // also notify analytics room
    io.to("analytics").emit("poll-total-updated", {
      pollId: pollId,
      newTotalVotes: updatedPoll.voteCount
    });

    for (const selection of selected) {
      const updatedQuestion = await Question.findOneAndUpdate(
        { _id: selection.question, "options._id": selection.option },
        { $inc: { "options.$.selectedCount": 1 } },
        { returnDocument: "after" }
      );

      const updatedOption = updatedQuestion.options.find(
        opt => opt._id.toString() === selection.option.toString()
      );

      io.to(pollId).emit("option-count-updated", {
        questionId: selection.question,
        optionId: selection.option,
        newCount: updatedOption.selectedCount
      });
      io.to("analytics").emit("option-count-updated", {
        pollId: pollId,
        questionId: selection.question,
        optionId: selection.option,
        newCount: updatedOption.selectedCount
      });
    }

    console.log("[poll] vote submitted", {
      pollId,
      voteId: vote._id.toString(),
      voter: voterId ? voterId.toString() : "anonymous",
      totalVotes: updatedPoll.voteCount,
      selections: Array.isArray(selected) ? selected.length : 0,
    });

    return vote;
  } catch (err) {
    console.error("[poll] failed to submit vote", {
      pollId,
      voter: userId ? userId.toString() : "anonymous",
      message: err.message,
    });

    if (err.isOperational) {
      throw err;
    }

    throw ApiError.badRequest("Failed to submit vote"); 
  }
}

const getCreatorAnalytics = async (userId) => {
  if (!isValidObjectId(userId)) return {
    pollsCreated: 0,
    totalVotes: 0,
    topPolls: [],
    recentPolls: []
  };

  const pollsCreated = await Poll.countDocuments({ author: userId });

  const objectUserId = new mongoose.Types.ObjectId(userId);

  const totalAgg = await Poll.aggregate([
    { $match: { author: objectUserId } },
    { $group: { _id: null, totalVotes: { $sum: { $ifNull: ["$voteCount", 0] } } } },
  ]);

  const totalVotes = totalAgg.length ? totalAgg[0].totalVotes : 0;

  const topPolls = await Poll.find({ author: objectUserId })
    .sort({ voteCount: -1 })
    .limit(5)
    .select("title voteCount")
    .lean();

  const recentPolls = await Poll.find({ author: objectUserId })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("title createdAt")
    .lean();

  return {
    pollsCreated,
    totalVotes,
    topPolls,
    recentPolls,
  };
};

export {
  getMyPolls,
  getMyVotedPolls,
  getPollById,
  getPolls,
  publishPoll,
  createPoll,
  submitPoll,
  getCreatorAnalytics
};
