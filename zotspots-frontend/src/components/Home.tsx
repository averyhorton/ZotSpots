import { useNavigate } from "react-router-dom";

export default function Home() {
    const navigate = useNavigate();

    const enterLobby = () => {
        navigate("/play");
  };
    return (
        <div className="min-h-screen flex flex-col justify-center items-center">
            <h1 className="text-3xl mb-6">Welcome to PetrGuessr!</h1>
                <button className="px-6 py-3 bg-blue-500 text-white rounded" onClick={enterLobby}>Play</button>
        </div>
    );
};