interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  message: string;
}

export default function EmptyState({ icon: Icon, title, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(0, 163, 196, 0.08)", border: "1px solid rgba(0, 163, 196, 0.15)" }}>
        <Icon className="w-7 h-7 text-neon-600" />
      </div>
      <h3 className="text-star-300 font-semibold text-lg">{title}</h3>
      <p className="text-star-500 text-sm mt-1 max-w-xs">{message}</p>
    </div>
  );
}
