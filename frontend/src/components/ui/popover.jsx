import * as PopoverPrimitive from "@radix-ui/react-popover"

function Popover(props) {
  return <PopoverPrimitive.Root {...props} />
}

function PopoverTrigger(props) {
  return <PopoverPrimitive.Trigger {...props} />
}

function PopoverContent({ className = "", sideOffset = 4, ...props }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        className={`
          z-50 rounded-xl border border-white/10
          bg-white/5 p-3 text-white shadow-2xl
          backdrop-blur-xl
          ${className}
        `}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
}