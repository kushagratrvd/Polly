import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class CreatePollDto extends BaseDto {
  static schema = Joi.object({
    title: Joi.string()
      .trim()
      .min(2)
      .max(150)
      .required()
      .messages({
        "string.empty": "Poll title cannot be empty",
        "string.min": "Poll title must be at least 2 characters long",
        "string.max": "Poll title cannot exceed 150 characters",
      }),

    responseMode: Joi.string()
      .valid("anonymous", "authenticated")
      .default("anonymous")
      .messages({
        "any.only": "Response mode must be anonymous or authenticated",
      }),

    expiresAt: Joi.date()
      .iso()
      .greater("now")
      .allow(null)
      .default(null)
      .messages({
        "date.base": "Expiry time must be a valid date",
        "date.format": "Expiry time must be an ISO date",
        "date.greater": "Expiry time must be in the future",
      }),
          
    questions: Joi.array()
      .items(
        Joi.object({
          text: Joi.string().trim().required().messages({
            "string.empty": "Question text cannot be empty",
          }),
          
          optional: Joi.boolean().default(false),
          
          options: Joi.array()
            .items(
              Joi.object({
                text: Joi.string().trim().required().messages({
                  "string.empty": "Option text cannot be empty",
                }),
              })
            )
            .min(2)
            .required()
            .messages({
              "array.min": "Each question must have at least 2 options",
            }),
        })
      )
      .min(1)
      .custom((questions, helpers) => {
        const hasRequiredQuestion = questions.some((question) => !question.optional);

        if (!hasRequiredQuestion) {
          return helpers.error("questions.requiredQuestion");
        }

        return questions;
      })
      .required()
      .messages({
        "array.min": "A poll must contain at least 1 question",
        "questions.requiredQuestion": "A poll must contain at least one required question",
      }),
  });
}

export default CreatePollDto;
