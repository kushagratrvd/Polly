import * as pollService from "./poll.service.js"
import ApiResponse from "../../common/utils/api-response.js";

const getPolls = async (req, res) => {
  const polls = await pollService.getPolls(req);
  ApiResponse.ok(res, "Polls fetched successfully", polls);
};

const getPollById = async (req, res) => {
  const poll = await pollService.getPollById(req.params.id);
  ApiResponse.ok(res, "Poll fetched successfully", poll);
}

const getMyPolls = async (req, res) => {
  const polls = await pollService.getMyPolls(req.user.id);
  ApiResponse.ok(res, "My polls fetched", polls);
}

const getMyVotedPolls = async (req, res) => {
  const votedPolls = await pollService.getMyVotedPolls(req.user.id);
  ApiResponse.ok(res, "Voted polls fetched", votedPolls);
}

const createPoll = async (req, res) => {
  const poll = await pollService.createPoll({
    ...req.body,
    author: req.user.id,
  });

  ApiResponse.created(
    res, 
    "Poll created successfully",
    poll,
  );
}

const publishPoll = async (req, res) => {
  const poll = await pollService.publishPoll(req.params.id, req.user.id);
  ApiResponse.ok(res, "Poll results published", poll);
}

const getCreatorAnalytics = async (req, res) => {
  const analytics = await pollService.getCreatorAnalytics(req.user.id);
  ApiResponse.ok(res, "Creator analytics fetched", analytics);
}

const submitPoll = async (req, res) => {
  const userId = req.user ? req.user.id : undefined;
  
  if(userId) req.body.userId = userId;

  console.log("[poll] vote submission received", {
    pollId: req.body.pollId,
    voter: userId ? userId.toString() : "anonymous",
    selections: Array.isArray(req.body.selected) ? req.body.selected.length : 0,
  });

  const vote = await pollService.submitPoll(req.body);

  ApiResponse.ok(res, "Voted successfully", vote);
}

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
