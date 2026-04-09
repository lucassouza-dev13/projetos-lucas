let abaAtual = "filmes";

function mudarAba(aba) {
    abaAtual = aba;

    if (aba === "filmes") {
        mostrarFilmes();
    } else if (aba === "series") {
        mostrarApenasSeries();
    }
}

const API_KEY = "8bcf3516840c71be090ce067d3464a1d";

const modalTrailer = document.getElementById("modal-trailer");
const API_URL = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=pt-BR`;
const SEARCH_MOVIES = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=pt-BR&query=`;
const SEARCH_SERIES = `https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&language=pt-BR&query=`;
const SERIES_URL = `https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}&language=pt-BR`;

const IMG_PATH = "https://image.tmdb.org/t/p/w500";

const moviesEl = document.getElementById("movies-container");
const seriesEl = document.getElementById("series-container");
const search = document.getElementById("search");

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalDesc = document.getElementById("modal-desc");
const modalImg = document.getElementById("modal-img");
const modalRating = document.getElementById("modal-rating");
const modalDate = document.getElementById("modal-date");
const modalFavBtn = document.getElementById("modal-fav");
const closeBtn = document.getElementById("close");

const filmesTitle = document.getElementById("filmes");
const seriesTitle = document.getElementById("series");

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let itemAtual = null;

// ================= MODAL =================
modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
});
closeBtn.addEventListener("click", () => modal.classList.add("hidden"));

// ================= FILMES =================
async function getMovies(url) {
    const res = await fetch(url);
    const data = await res.json();
    showMovies(data.results);
}

function showMovies(movies) {
    if (abaAtual !== "favoritos") {
        moviesEl.innerHTML = "";
    }

    if (!movies || movies.length === 0) {
        moviesEl.innerHTML += "<h2>Nenhum filme encontrado 😢</h2>";
        return;
    }

    movies.forEach(movie => {
        const { id, title, poster_path, vote_average, overview } = movie;

        const movieEl = document.createElement("div");
        movieEl.classList.add("movie");

        movieEl.innerHTML = `
            <img src="${poster_path ? IMG_PATH + poster_path : ''}">
            <div class="movie-info">
                <h3>${title}</h3>
                <span class="${getClassByRate(vote_average)}">⭐ ${vote_average}</span>
            </div>
            <button class="fav-btn">❤️</button>
        `;

        moviesEl.appendChild(movieEl);

        const favBtn = movieEl.querySelector(".fav-btn");

        if (favorites.find(f => f.id === id)) {
            favBtn.style.background = "red";
        }

        favBtn.addEventListener("click", (e) => {
            e.stopPropagation();

            const isFav = favorites.find(f => f.id === id);

            if (isFav) {
                favorites = favorites.filter(f => f.id !== id);
                favBtn.style.background = "#000";
            } else {
                favorites.push({ ...movie, media_type: "movie" });
                favBtn.style.background = "red";
            }

            saveFavorites();
        });

        //  MODAL NOVO
        movieEl.addEventListener("click", () => {
            itemAtual = { ...movie, media_type: "movie" };

            modal.classList.remove("hidden");
            modalTitle.innerText = movie.title;
            modalDesc.innerText = movie.overview || "Sem descrição disponível.";
            modalImg.src = movie.poster_path ? IMG_PATH + movie.poster_path : "";

            modalRating.innerText = "⭐ " + movie.vote_average;
            modalDate.innerText = movie.release_date || "Data desconhecida";

            atualizarBotaoFavorito(movie.id);

            buscarTrailer(movie.id, "movie");
        });
    });
}

// ================= SÉRIES =================
async function buscarSeries() {
    const res = await fetch(SERIES_URL);
    const data = await res.json();
    mostrarSeries(data.results);
}

function mostrarSeries(series) {
    if (abaAtual !== "favoritos") {
        seriesEl.innerHTML = "";
    }

    if (!series || series.length === 0) {
        seriesEl.innerHTML += "<h2>Nenhuma série encontrada 😢</h2>";
        return;
    }

    series.forEach(serie => {
        const { id, name, poster_path, vote_average, overview } = serie;

        const serieEl = document.createElement("div");
        serieEl.classList.add("movie");

        serieEl.innerHTML = `
            <img src="${poster_path ? IMG_PATH + poster_path : ''}">
            <div class="movie-info">
                <h3>${name}</h3>
                <span class="${getClassByRate(vote_average)}">⭐ ${vote_average}</span>
            </div>
            <button class="fav-btn">❤️</button>
        `;

        seriesEl.appendChild(serieEl);

        const favBtn = serieEl.querySelector(".fav-btn");

        if (favorites.find(f => f.id === id)) {
            favBtn.style.background = "red";
        }

        favBtn.addEventListener("click", (e) => {
            e.stopPropagation();

            const isFav = favorites.find(f => f.id === id);

            if (isFav) {
                favorites = favorites.filter(f => f.id !== id);
                favBtn.style.background = "#000";
            } else {
                favorites.push({ ...serie, media_type: "tv" });
                favBtn.style.background = "red";
            }

            saveFavorites();

            buscarTrailer(serie.id, "tv");

        
        });

        //  MODAL NOVO
        serieEl.addEventListener("click", () => {
            itemAtual = { ...serie, media_type: "tv" };

            modal.classList.remove("hidden");
            modalTitle.innerText = serie.name;
            modalDesc.innerText = serie.overview || "Sem descrição disponível.";
            modalImg.src = serie.poster_path ? IMG_PATH + serie.poster_path : "";

            modalRating.innerText = "⭐ " + serie.vote_average;
            modalDate.innerText = serie.first_air_date || "Data desconhecida";

            atualizarBotaoFavorito(serie.id);

            buscarTrailer(serie.id, "tv");

        });
    });
}

// ================= ABAS =================
function mostrarFilmes() {
    abaAtual = "filmes";

    filmesTitle.style.display = "block";
    seriesTitle.style.display = "none";

    moviesEl.innerHTML = "";
    seriesEl.innerHTML = "";

    getMovies(API_URL);
}

function mostrarApenasSeries() {
    abaAtual = "series";

    filmesTitle.style.display = "none";
    seriesTitle.style.display = "block";

    moviesEl.innerHTML = "";
    seriesEl.innerHTML = "";

    buscarSeries();
}

// ================= FAVORITOS =================
document.getElementById("show-favorites").addEventListener("click", () => {
    abaAtual = "favoritos";

    filmesTitle.style.display = "none";
    seriesTitle.style.display = "none";

    moviesEl.innerHTML = "";
    seriesEl.innerHTML = "";

    if (favorites.length === 0) {
        moviesEl.innerHTML = "<h2>Sem Favoritos</h2>";
        return;
    }

    const favMovies = favorites.filter(f => f.media_type === "movie");
    const favSeries = favorites.filter(f => f.media_type === "tv");

    if (favMovies.length > 0) {
        const tituloFilmes = document.createElement("h2");
        tituloFilmes.innerText = "🎬 Filmes Favoritos";
        moviesEl.appendChild(tituloFilmes);

        favMovies.forEach(movie => {
            const card = document.createElement("div");
            card.classList.add("movie");

            card.innerHTML = `
                <img src="${movie.poster_path ? IMG_PATH + movie.poster_path : ''}">
                <div class="movie-info">
                    <h3>${movie.title}</h3>
                    <span class="${getClassByRate(movie.vote_average)}">⭐ ${movie.vote_average}</span>
                </div>
            `;

            moviesEl.appendChild(card);
        });
    }

    if (favSeries.length > 0) {
        const tituloSeries = document.createElement("h2");
        tituloSeries.innerText = "📺 Séries Favoritas";
        seriesEl.appendChild(tituloSeries);

        favSeries.forEach(serie => {
            const card = document.createElement("div");
            card.classList.add("movie");

            card.innerHTML = `
                <img src="${serie.poster_path ? IMG_PATH + serie.poster_path : ''}">
                <div class="movie-info">
                    <h3>${serie.name}</h3>
                    <span class="${getClassByRate(serie.vote_average)}">⭐ ${serie.vote_average}</span>
                </div>
            `;

            seriesEl.appendChild(card);
        });
    }
});

// ================= BUSCA =================
search.addEventListener("input", async () => {
    const query = search.value.trim();

    if (!query) {
        if (abaAtual === "filmes") return getMovies(API_URL);
        if (abaAtual === "series") return buscarSeries();

        getMovies(API_URL);
        buscarSeries();
        return;
    }

    if (abaAtual === "filmes") {
        const res = await fetch(SEARCH_MOVIES + query);
        const data = await res.json();
        showMovies(data.results);
    } 
    else if (abaAtual === "series") {
        const res = await fetch(SEARCH_SERIES + query);
        const data = await res.json();
        mostrarSeries(data.results);
    } 
    else {
        const [resMovies, resSeries] = await Promise.all([
            fetch(SEARCH_MOVIES + query),
            fetch(SEARCH_SERIES + query)
        ]);

        const dataMovies = await resMovies.json();
        const dataSeries = await resSeries.json();

        showMovies(dataMovies.results);
        mostrarSeries(dataSeries.results);
    }
});

// ================= FAVORITO MODAL =================
function atualizarBotaoFavorito(id) {
    const isFav = favorites.find(f => f.id === id);

    modalFavBtn.innerText = isFav
        ? "💔 Remover dos Favoritos"
        : "❤️ Favoritar";
}

modalFavBtn.addEventListener("click", () => {
    if (!itemAtual) return;

    const isFav = favorites.find(f => f.id === itemAtual.id);

    if (isFav) {
        favorites = favorites.filter(f => f.id !== itemAtual.id);
    } else {
        favorites.push(itemAtual);
    }

    saveFavorites();
    atualizarBotaoFavorito(itemAtual.id);
});

// ================= UTIL =================
function getClassByRate(vote) {
    if (vote >= 8) return "green";
    if (vote >= 5) return "orange";
    return "red";
}

function saveFavorites() {
    localStorage.setItem("favorites", JSON.stringify(favorites));
}

// ================= INIT =================
window.onload = () => {
    mostrarFilmes();
};

async function buscarTrailer(id, tipo) {
    try {
        const url = `https://api.themoviedb.org/3/${tipo}/${id}/videos?api_key=${API_KEY}&language=pt-BR`;
        const res = await fetch(url);
        const data = await res.json();

        
        let video = data.results.find(
            vid => vid.type === "Trailer" && vid.site === "YouTube"
        );

        // se não tiver trailer, tenta teaser
        if (!video) {
            video = data.results.find(
                vid => vid.site === "YouTube"
            );
        }

        if (video) {
            modalTrailer.src = `https://www.youtube.com/embed/${video.key}`;
        } else {
            modalTrailer.src = "";
        }

    } catch (error) {
        console.error("Erro ao buscar trailer:", error);
        modalTrailer.src = "";
    }
}

closeBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    modalTrailer.src = "";
});

modal.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.classList.add("hidden");
        modalTrailer.src = "";
    }
});

function filtrarGenero(generoId) {
    abaAtual = "filmes";

    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=${generoId}&language=pt-BR`;

    moviesEl.innerHTML = "";
    seriesEl.innerHTML = "";

    getMovies(url);
}
