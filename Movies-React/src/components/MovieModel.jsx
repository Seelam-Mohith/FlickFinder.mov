import React from "react";

const MovieModel = ({ isOpen, movie, onClose }) => {
    if (!isOpen || !movie) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-32 pb-12">
            <div
                className="relative w-full max-w-4xl h-[75vh] rounded-2xl overflow-hidden shadow-2xl bg-cover bg-center"
                style={{ backgroundImage: "url('/modal.png')" }}
            >
                <button
                    onClick={onClose}
                    type="button"
                    aria-label="Close"
                    className="absolute top-4 right-4 text-white text-2xl bg-black/60 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/80 transition shadow-lg z-10"
                >
                    ✕
                </button>

                <div className="absolute inset-0 bg-[#0b0b1f]/85 p-8 flex flex-col">
                    <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-y-auto">
                        <img
                            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                            className="w-full max-w-xs self-center lg:self-start rounded-xl shadow-lg"
                            alt={movie.title}
                        />

                        <div className="flex flex-col gap-4 text-white">
                            <div>
                                <h2 className="text-3xl font-bold leading-tight">{movie.title}</h2>
                                <p className="text-sm text-gray-400 mt-1">
                                    {movie.release_date} | {movie.runtime} min
                                </p>
                            </div>

                            <p className="text-gray-200 leading-relaxed">{movie.overview}</p>

                            <div className="flex flex-wrap gap-2">
                                {movie.genres?.map((g) => (
                                    <span
                                        key={g.id}
                                        className="px-3 py-1 bg-purple-600/80 rounded-full text-sm"
                                    >
                                        {g.name}
                                    </span>
                                ))}
                            </div>

                            {movie.homepage && (
                                <a
                                    href={movie.homepage}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center justify-center w-fit px-5 py-2 mt-auto bg-purple-500 hover:bg-purple-600 rounded-lg font-medium transition"
                                >
                                    Visit Homepage →
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MovieModel;