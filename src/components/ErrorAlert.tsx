interface ErrorAlertProps {
    message: string | null;
}

export default function ErrorAlert({ message }: ErrorAlertProps) {
    if (!message) return null;

    return (
        <div className="alert alert-error mb-4">
            {message}
        </div>
    );
}
