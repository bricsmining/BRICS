import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const Select = ({ value, onValueChange, children }) => {
  return (
    <SelectRoot value={value} onValueChange={onValueChange}>
      {children}
    </SelectRoot>
  );
};

const SelectRoot = ({ children, value, onValueChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Extract children to find trigger and content
  let triggerChild = null;
  let contentChild = null;

  React.Children.forEach(children, child => {
    if (child.type === SelectTrigger) {
      triggerChild = React.cloneElement(child, {
        onClick: () => setOpen(!open),
        'aria-expanded': open
      });
    } else if (child.type === SelectContent) {
      contentChild = React.cloneElement(child, {
        open,
        value,
        onValueChange: (newValue) => {
          onValueChange(newValue);
          setOpen(false);
        }
      });
    }
  });

  return (
    <div className="relative inline-block text-left" ref={ref}>
      {triggerChild}
      {open && contentChild}
    </div>
  );
};

const SelectValue = ({ children }) => {
  return <span>{children}</span>;
};

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    className={`flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm focus:outline-none ${className}`}
    {...props}
  >
    {children}
    <ChevronDown className="h-4 w-4 opacity-50" />
  </button>
));
SelectTrigger.displayName = 'SelectTrigger';

const SelectContent = ({ className, children, open, value, onValueChange }) => {
  if (!open) return null;

  // Clone children to add selection functionality
  const items = React.Children.map(children, child => {
    if (child.type === SelectItem) {
      return React.cloneElement(child, {
        selected: child.props.value === value,
        onClick: () => onValueChange(child.props.value)
      });
    }
    return child;
  });

  return (
    <div className={`absolute z-50 mt-1 w-full rounded-md border bg-[#1a1a1a] shadow-lg ${className}`}>
      <div className="py-1">{items}</div>
    </div>
  );
};

const SelectItem = React.forwardRef(({ className, children, value, selected, ...props }, ref) => (
  <div
    ref={ref}
    className={`px-4 py-2 text-sm cursor-pointer hover:bg-white/10 ${selected ? 'bg-white/5' : ''} ${className}`}
    {...props}
  >
    {children}
    {selected && <span className="absolute right-2">✓</span>}
  </div>
));
SelectItem.displayName = 'SelectItem';

// We don't need these for basic functionality but include them for API compatibility
const SelectGroup = ({ children }) => <div>{children}</div>;
const SelectLabel = ({ children }) => <div className="px-4 py-2 text-xs font-semibold">{children}</div>;
const SelectSeparator = () => <hr className="my-1 border-t border-white/10" />;
const SelectScrollUpButton = () => null;
const SelectScrollDownButton = () => null;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
