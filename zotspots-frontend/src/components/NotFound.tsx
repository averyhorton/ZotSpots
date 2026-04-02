import { useNavigate } from "react-router-dom";

export default function NotFound() {
    const navigate = useNavigate();
    
    const backHome = () => {
        window.scrollTo(0, 0); // Reset scroll position when jumping
        navigate("/");
    };

    return (
        <div>
            <div className="absolute inset-0 z-0 bg-primary-dark">
                    {/* Gradient Overlay for style and contrast */}
                    <div className="absolute inset-0 bg-linear-to-b from-primary-dark/70 via-primary-dark/40 to-background/90 z-10" />
                </div>
            
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-7xl md:text-8xl lg:text-9xl font-black mb-6 text-white drop-shadow-[0_0_25px_rgba(255,210,0,0.3)] tracking-tight leading-none">
                    <span className="text-white">Petr</span>
                    <span className="text-accent">Guessr</span>
                </h1>
                <div className="flex items-center justify-center gap-4 z-50">
                    <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-black/75"
                        >Lost? Try this
                    </h3>
                    <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                    <button
                            className="relative group overflow-hidden px-12 py-5 bg-accent text-black font-extrabold text-2xl rounded-2xl shadow-[0_0_30px_rgba(255,210,0,0.5)] hover:shadow-[0_0_50px_rgba(255,210,0,0.8)] transition-all duration-300 hover:-translate-y-1"
                            onClick={backHome}
                        >Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
};