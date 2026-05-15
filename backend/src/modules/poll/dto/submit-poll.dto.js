import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class SubmitPollDto extends BaseDto {
  static schema = Joi.object({
    pollId: Joi.string().trim().required().messages({
      "string.empty": "Poll id is required",
    }),

    selected: Joi.array()
      .items(
        Joi.object({
          question: Joi.string().trim().required().messages({
            "string.empty": "Question id is required",
          }),
          option: Joi.string().trim().required().messages({
            "string.empty": "Option id is required",
          }),
        }),
      )
      .default([]),
  });
}

export default SubmitPollDto;
