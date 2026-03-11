interface CenteredTextProps {
  children: React.ReactNode;
  className?: string;
}

export function CenteredText({ children, className = "" }: CenteredTextProps) {
  return (
    <div
      className={`copt-centered-text w-full min-w-0 max-w-full text-center text-xs sm:text-sm md:text-base lg:text-lg ${className}`}
    >
      {children}
    </div>
  );
}
