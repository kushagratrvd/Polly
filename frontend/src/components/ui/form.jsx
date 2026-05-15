import * as React from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const Form = FormProvider;

function Slot({ children, ...props }) {
  if (!React.isValidElement(children)) {
    return null;
  }

  return React.cloneElement(children, {
    ...props,
    ...children.props,
  });
}

const FormFieldContext = React.createContext({});
const FormItemContext = React.createContext({});

function FormField({ name, control, render }) {
  return (
    <FormFieldContext.Provider value={{ name }}>
      <Controller control={control} name={name} render={render} />
    </FormFieldContext.Provider>
  );
}

function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);
  const id = itemContext.id;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
}

function FormItem({ className, ...props }) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  );
}

function FormLabel({ className, ...props }) {
  const { formItemId, error } = useFormField();

  return (
    <Label
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

function FormControl({ ...props }) {
  const { formItemId, formDescriptionId, formMessageId, error } = useFormField();

  return (
    <Slot
      id={formItemId}
      aria-describedby={
        !error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  );
}

function FormDescription({ className, ...props }) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function FormMessage({ className, children, ...props }) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error.message) : children;

  if (!body) return null;

  return (
    <p
      id={formMessageId}
      className={cn("text-sm text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  );
}

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
};