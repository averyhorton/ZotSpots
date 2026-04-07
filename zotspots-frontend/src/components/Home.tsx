import { useNavigate } from "react-router-dom";

// Icons 
const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-light">
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const TrophyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
);

export default function Home() {
    const navigate = useNavigate();

    const enterLobby = () => {
        window.scrollTo(0, 0); // Reset scroll position when jumping
        navigate("/play");
    };

    return (
        <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden font-sans">
            {/* HEROS SECTION */}
            <section className="relative min-h-screen flex flex-col justify-center items-center px-4 overflow-hidden">
                {/* Background Layer */}
                <div className="absolute inset-0 z-0 bg-primary-dark">
                    <picture>
                        <source media="(min-width: 768px)" srcSet="/UCI%20Map%20Desktop%20Background.png" />
                        <img
                            src="/UCI%20Map%20Phone%20Background.png"
                            alt="UCI Map Background"
                            className="w-full h-full object-cover filter blur-xs scale-105 opacity-60"
                        />
                    </picture>

                    {/* Faux map pins directly on the background (Desktop only) */}
                    <img
                        src="/PetrGuessr%20Logo.png"
                        alt="Petr Pin Desktop"
                        className="hidden md:block absolute top-[25%] left-[5%] lg:left-[10%] xl:left-[15%] md:w-20 opacity-70 animate-float drop-shadow-2xl z-0"
                    />
                    <img
                        src="/PetrGuessr%20Logo.png"
                        alt="Petr Pin Desktop"
                        style={{ animationDelay: '1.5s' }}
                        className="hidden md:block absolute top-[60%] right-[5%] lg:right-[10%] xl:right-[15%] md:w-24 opacity-60 animate-float drop-shadow-2xl z-0"
                    />

                    {/* Gradient Overlay for style and contrast */}
                    <div className="absolute inset-0 bg-linear-to-b from-primary-dark/70 via-primary-dark/40 to-background/90 z-10" />
                </div>

                {/* Hero Content */}
                <div className="relative z-20 flex flex-col items-center text-center max-w-4xl mx-auto container animate-fade-in-delay-1 mt-12">
                    {/* Mobile only pin centered above pill */}
                    <img
                        src="/PetrGuessr%20Logo.png"
                        alt="Petr Pin Mobile"
                        className="md:hidden w-16 mb-4 opacity-80 animate-float drop-shadow-xl z-20"
                    />
                    <div className="mb-6 inline-block bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 text-xs md:text-sm text-accent-light uppercase tracking-[0.2em] font-bold shadow-xl">
                        The UC Irvine GeoGuessr
                    </div>

                    <h1 className="text-7xl md:text-8xl lg:text-9xl font-black mb-6 text-white drop-shadow-[0_0_25px_rgba(255,210,0,0.3)] tracking-tight leading-none">
                        <span className="text-white">Petr</span>
                        <span className="text-accent">Guessr</span>
                    </h1>

                    <p className="text-lg md:text-2xl mb-12 text-white/95 max-w-3xl font-medium drop-shadow-lg leading-relaxed">
                        Test your UCI campus knowledge. Drop into a random spot, look around, and guess where you are before time runs out!
                    </p>

                    <button
                        className="relative group overflow-hidden px-12 py-5 bg-accent text-black font-extrabold text-2xl rounded-2xl shadow-[0_0_30px_rgba(255,210,0,0.5)] hover:shadow-[0_0_50px_rgba(255,210,0,0.8)] transition-all duration-300 hover:-translate-y-1"
                        onClick={enterLobby}
                    >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 w-full h-full bg-linear-to-r from-transparent via-white/40 to-transparent skew-x-12 -translate-x-[150%] group-hover:animate-[shimmer_1.5s_infinite]" />
                        <span className="relative flex items-center gap-3">
                            Play Now
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                        </span>
                    </button>

                    <div className="mt-16 animate-bounce cursor-pointer opacity-70 hover:opacity-100 transition-opacity" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                </div>
            </section>

            {/* HOW TO PLAY SECTION */}
            <section className="py-24 px-6 md:px-12 bg-background relative z-20">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16 animate-fade-in-delay-2">
                        <h2 className="text-5xl md:text-6xl font-black text-primary-dark mb-6 drop-shadow-sm">How To Play</h2>
                        <div className="w-24 h-2 bg-accent mx-auto rounded-full" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative">
                        {/* Connecting Line (Desktop only) */}
                        <div className="hidden md:block absolute top-[20%] left-[10%] right-[10%] h-1 bg-linear-to-r from-transparent via-primary/20 to-transparent z-0" />

                        {/* Step 1 */}
                        <div className="flex flex-col items-center text-center p-8 bg-white/70 backdrop-blur-md rounded-3xl shadow-xl hover:-translate-y-2 transition-transform duration-300 z-10 border border-white/50">
                            <div className="w-24 h-24 bg-primary-dark text-white rounded-2xl shadow-lg flex items-center justify-center mb-6 rotate-3">
                                <EyeIcon />
                            </div>
                            <h3 className="text-2xl font-black mb-4 text-primary-dark">Step 1: Observe</h3>
                            <p className="text-muted leading-relaxed font-medium text-lg">
                                Drop into a random spot on campus. Look around for clues. <strong className="text-primary-dark">"Is that Gateway or Langson?"</strong>
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="flex flex-col items-center text-center p-8 bg-white/70 backdrop-blur-md rounded-3xl shadow-xl hover:-translate-y-2 transition-transform duration-300 z-10 border border-white/50">
                            <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-6 -rotate-3 overflow-hidden p-3 border-4 border-accent">
                                <img src="/PetrGuessr%20Logo.png" alt="Locate Icon" className="w-full h-full object-contain" />
                            </div>
                            <h3 className="text-2xl font-black mb-4 text-primary-dark">Step 2: Locate</h3>
                            <p className="text-muted leading-relaxed font-medium text-lg">
                                Think you know where you are? Drop your Petr-pin on the interactive campus map. Precision is key!
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="flex flex-col items-center text-center p-8 bg-white/70 backdrop-blur-md rounded-3xl shadow-xl hover:-translate-y-2 transition-transform duration-300 z-10 border border-white/50">
                            <div className="w-24 h-24 bg-accent text-primary-dark rounded-2xl shadow-lg flex items-center justify-center mb-6 rotate-3">
                                <TrophyIcon />
                            </div>
                            <h3 className="text-2xl font-black mb-4 text-primary-dark">Step 3: Score</h3>
                            <p className="text-muted leading-relaxed font-medium text-lg">
                                The closer your pin is to the actual location, the higher your score. Compete to be the ultimate PetrGuessr!
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-primary-dark text-white/50 py-8 text-center text-sm font-medium border-t border-primary/30">
                <p>PetrGuessr 2026</p>
                <p>v1.0.1 alpha</p>
            </footer>
        </div>
    );
}
