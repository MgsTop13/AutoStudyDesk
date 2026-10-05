import "./header.scss";
import { Link } from "react-router";

export default function HeaderP({ onSettingsClick }) {
    return (
        <header>
            <Link to="/Home" className="link">← Voltar</Link>

            {onSettingsClick && (
                <button
                    className="btn-settings"
                    onClick={onSettingsClick}
                    aria-label="Configurações"
                >
                    <img
                        src="/icons/settings.png"
                        alt="Configurações"
                        className="settings-icon"
                        onError={(e) => {
                            // Fallback caso a imagem não exista ainda
                            e.target.style.display = "none";
                            e.target.parentElement.innerText = "⚙️";
                        }}
                    />
                </button>
            )}
        </header>
    );
}