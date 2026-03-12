import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
                    <h1 style={{ color: "#dc3545" }}>Something went wrong.</h1>
                    <p>The application encountered an unexpected error.</p>
                    <div style={{
                        marginTop: "20px",
                        padding: "20px",
                        background: "#f8f9fa",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        textAlign: "left",
                        display: "inline-block",
                        maxWidth: "800px",
                        overflow: "auto"
                    }}>
                        <code style={{ whiteSpace: "pre-wrap", color: "#d63384" }}>
                            {this.state.error?.toString()}
                        </code>
                    </div>
                    <div style={{ marginTop: "30px" }}>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                padding: "10px 20px",
                                fontSize: "16px",
                                cursor: "pointer",
                                background: "#007bff",
                                color: "white",
                                border: "none",
                                borderRadius: "4px"
                            }}
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
