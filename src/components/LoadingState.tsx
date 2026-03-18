interface LoadingStateProps {
    message: string;
}

export default function LoadingState({ message }: LoadingStateProps) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <div className="animate-pulse text-secondary">{message}</div>
        </div>
    );
}
