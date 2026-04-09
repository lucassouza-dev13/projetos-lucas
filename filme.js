let abaAtual = "filmes";

const API_KEY = "8bcf3516840c71be090ce067d3464a1d";

const IMG_PATH = "https://image.tmdb.org/t/p/w500";

const moviesEl = document.getElementById("movies-container");
const seriesEl = document.getElementById("series-container");
const search = document.getElementById("search");

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalDesc = document.getElementById("modal-desc");
const modalImg = document.getElementById("modal-img");
const modalFavBtn = document.getElementById("modal-fav");

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let itemAtual = null;

// ================= ABAS =================
function mudarAba(aba) {
    abaAtual = aba;
    moviesEl.innerHTML = "";
    seriesEl.innerHTML = "";

    if (aba === "filmes") carregarFilmes();
    if (aba === "series") carregarSeries();
    if (aba === "documentarios") carregarDocumentarios();
    if (aba === "animes") carregarAnimes();
}

// ================= FETCH =================
async function fetchData(url) {
    const res = await fetch(url);
    const data = await res.json();
    return data.results;
}

// ================= FILMES =================
async function carregarFilmes() {
    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=pt-BR`;
    const data = await fetchData(url);
    showMovies(data);
}

// ================= SÉRIES =================
async function carregarSeries() {
    const url = `https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}&language=pt-BR`;
    const data = await fetchData(url);
    mostrarSeries(data);
}

// ================= DOCUMENTÁRIOS =================
async function carregarDocumentarios() {
    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=99&language=pt-BR`;
    const data = await fetchData(url);
    showMovies(data);
}

// ================= ANIMES =================
async function carregarAnimes() {
    const urlMovies = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=16&with_original_language=ja`;
    const urlSeries = `https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&with_genres=16&with_original_language=ja`;

    const [movies, series] = await Promise.all([
        fetchData(urlMovies),
        fetchData(urlSeries)
    ]);

    showMovies(movies);
    mostrarSeries(series);
}

// ================= RENDER FILMES =================
function showMovies(movies) {
    moviesEl.innerHTML = "";

    movies.forEach(movie => {
        const card = document.createElement("div");
        card.classList.add("movie");

        card.innerHTML = `
            <img src="${IMG_PATH + movie.poster_path}">
            <div class="movie-info">
                <h3>${movie.title}</h3>
            </div>
            <button class="fav-btn">❤️</button>
        `;

        moviesEl.appendChild(card);

        const favBtn = card.querySelector(".fav-btn");

        if (favorites.find(f => f.id === movie.id)) {
            favBtn.style.background = "red";
        }

        favBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleFavorito(movie, "movie", favBtn);
        });

        card.addEventListener("click", () => abrirModal(movie, "movie"));
    });
}

// ================= RENDER SÉRIES =================
function mostrarSeries(series) {
    seriesEl.innerHTML = "";

    series.forEach(serie => {
        const card = document.createElement("div");
        card.classList.add("movie");

        card.innerHTML = `
            <img src="${IMG_PATH + serie.poster_path}">
            <div class="movie-info">
                <h3>${serie.name}</h3>
            </div>
            <button class="fav-btn">❤️</button>
        `;

        seriesEl.appendChild(card);

        const favBtn = card.querySelector(".fav-btn");

        if (favorites.find(f => f.id === serie.id)) {
            favBtn.style.background = "red";
        }

        favBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleFavorito(serie, "tv", favBtn);
        });

        card.addEventListener("click", () => abrirModal(serie, "tv"));
    });
}

// ================= FAVORITOS =================
function toggleFavorito(item, tipo, btn) {
    const isFav = favorites.find(f => f.id === item.id);

    if (isFav) {
        favorites = favorites.filter(f => f.id !== item.id);
        btn.style.background = "#000";
    } else {
        favorites.push({ ...item, media_type: tipo });
        btn.style.background = "red";
    }

    saveFavorites();
}

// ================= MODAL =================
function abrirModal(item, tipo) {
    itemAtual = { ...item, media_type: tipo };

    modal.classList.remove("hidden");
    modalTitle.innerText = item.title || item.name;
    modalDesc.innerText = item.overview || "Sem descrição";
    modalImg.src = IMG_PATH + item.poster_path;

    atualizarBotaoFavorito(item.id);
}

// botão dentro do modal
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

function atualizarBotaoFavorito(id) {
    const isFav = favorites.find(f => f.id === id);

    modalFavBtn.innerText = isFav
        ? "💔 Remover dos Favoritos"
        : "❤️ Favoritar";
}

function saveFavorites() {
    localStorage.setItem("favorites", JSON.stringify(favorites));
}

// ================= INIT =================
window.onload = () => {
    carregarFilmes();
};
