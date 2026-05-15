import { Router } from "express";
import * as controller from "./poll.controller.js";
import { authenticate, optionalAuthenticate } from "../auth/auth.middleware.js";
import validate from "../../common/middleware/validate.middleware.js";
import CreatePollDto from "./dto/create-poll.dto.js";
import SubmitPollDto from "./dto/submit-poll.dto.js";

const router = Router();

router.get("/all", controller.getPolls);
router.get("/analytics/creator", authenticate, controller.getCreatorAnalytics);
router.get("/my-polls", authenticate, controller.getMyPolls);
router.get("/my-votes", authenticate, controller.getMyVotedPolls);

router.post(
  "/create", 
  authenticate, 
  validate(CreatePollDto.schema),
  controller.createPoll
);

router.post(
  "/submit",
  optionalAuthenticate,
  validate(SubmitPollDto),
  controller.submitPoll,
);

router.post("/:id/publish", authenticate, controller.publishPoll);

router.get("/:id", controller.getPollById);

export default router;
