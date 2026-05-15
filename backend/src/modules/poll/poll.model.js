import mongoose from "mongoose";

const pollSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    responseMode: {
      type: String,
      enum: ["anonymous", "authenticated"],
      default: "anonymous",
      required: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
      default: null,
    },

    voteCount: {
      type: Number,
      default: 0,
    }
  },
  { timestamps: true },
);

const optionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    selectedCount: {
      type: Number,
      default: 0,
    },
  }
)

const questionSchema = new mongoose.Schema(
  { 
    poll: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poll",
      required: true,
    }, 
    text: {
      type: String,
      required: true,
    },
    optional: Boolean,

    options: [optionSchema], 
  }
)

const voteSchema = new mongoose.Schema(
  {
    poll: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Poll",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    selected: [
      {
        question: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
          required: true,
        },
        option: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
      },
    ], 
  },
  { timestamps: true },
)

const Poll = mongoose.model("Poll", pollSchema);
const Question = mongoose.model("Question", questionSchema);
const Vote = mongoose.model("Vote", voteSchema);

export { Poll, Question, Vote };
