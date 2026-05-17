import React from "react";
import { cn } from "@/lib/utils"
import { buttonVariants } from "./buttonVariants"

// Lightweight Slot shim to avoid adding @radix-ui/react-slot dependency.
function Slot({ children, className, ...props }) {
  const child = React.Children.only(children);
  const mergedClassName = [child.props.className, className].filter(Boolean).join(" ");
  return React.cloneElement(child, { ...child.props, ...props, className: mergedClassName });
}

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Button }
