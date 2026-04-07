interface LoadingSpinnerProps {
  text?: string;
}

export default function LoadingSpinner({ text }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center gap-3.5">
      <div className="flex gap-1.5">
        <div
          className="w-2 h-2 rounded-full bg-primary [animation:bounce_1.2s_infinite_ease-in-out]"
          style={{ animationDelay: "0s" }}
        />
        <div
          className="w-2 h-2 rounded-full bg-primary [animation:bounce_1.2s_infinite_ease-in-out]"
          style={{ animationDelay: "0.2s" }}
        />
        <div
          className="w-2 h-2 rounded-full bg-primary [animation:bounce_1.2s_infinite_ease-in-out]"
          style={{ animationDelay: "0.4s" }}
        />
      </div>
      {text && (
        <div className="text-sm text-gray-500 font-medium">{text}</div>
      )}
    </div>
  );
}
