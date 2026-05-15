import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
    : (typeof window !== "undefined" ? window.location.origin : "http://localhost:4000"));
const EMPTY_SETTERS = [];

const getPollId = (poll) => poll?._id || poll?.id;
const sameId = (left, right) => String(left) === String(right);

function updatePollTotal(poll, pollId, newTotalVotes) {
  if (!poll || !sameId(getPollId(poll), pollId)) return poll;
  return { ...poll, voteCount: newTotalVotes };
}

function updateOptionCount(poll, questionId, optionId, newCount) {
  if (!poll?.questions) return poll;

  return {
    ...poll,
    questions: poll.questions.map((question) => {
      if (!sameId(getPollId(question), questionId)) return question;

      return {
        ...question,
        options: (question.options || []).map((option) =>
          sameId(getPollId(option), optionId)
            ? { ...option, selectedCount: newCount }
            : option,
        ),
      };
    }),
  };
}

export function useLivePoll({ pollId, setSelectedPoll, pollListSetters = EMPTY_SETTERS }) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!pollId) {
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join-poll-room", pollId);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("poll-total-updated", ({ pollId: updatedPollId, newTotalVotes }) => {
      setSelectedPoll((current) =>
        updatePollTotal(current, updatedPollId, newTotalVotes),
      );

      pollListSetters.forEach((setter) => {
        setter((current) =>
          current.map((poll) => updatePollTotal(poll, updatedPollId, newTotalVotes)),
        );
      });
    });

    socket.on("option-count-updated", ({ questionId, optionId, newCount }) => {
      setSelectedPoll((current) =>
        updateOptionCount(current, questionId, optionId, newCount),
      );
    });

    socket.on("poll-published", ({ pollId: publishedPollId, publishedAt }) => {
      setSelectedPoll((current) => {
        if (!current || !sameId(getPollId(current), publishedPollId)) return current;
        return { ...current, isPublished: true, publishedAt };
      });

      pollListSetters.forEach((setter) => {
        setter((current) =>
          current.map((poll) =>
            sameId(getPollId(poll), publishedPollId)
              ? { ...poll, isPublished: true, publishedAt }
              : poll,
          ),
        );
      });
    });

    socket.on("connect_error", (error) => {
      setConnected(false);
      console.warn("[socket] connection failed", error.message);
    });

    return () => {
      socket.emit("leave-poll-room", pollId);
      socket.removeAllListeners();
      socket.disconnect();
      setConnected(false);
    };
  }, [pollId, pollListSetters, setSelectedPoll]);

  return { connected };
}
