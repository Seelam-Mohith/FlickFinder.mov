import React from 'react'
import Search from './components/Search'
import Spinner from './components/Spinner'
import MovieCard from './components/MovieCard'
import NavBar from './components/NavBar'
import MovieModel from './components/MovieModel'
import { useState } from 'react'
import { useEffect } from 'react'
import { useDebounce } from 'react-use'
import { client, updateSearchCount, getTrendingMovies, isAppwriteReady } from './appwrite.js'

const API_BASE_URL = 'https://api.themoviedb.org/3';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY?.trim();
const API_BEARER_TOKEN = import.meta.env.VITE_TMDB_BEARER_TOKEN?.trim();

const API_OPTIONS = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    ...(API_BEARER_TOKEN ? { Authorization: `Bearer ${API_BEARER_TOKEN}` } : {})
  }
}

const TMDB_TIMEOUT_MS = 12000;

const withTmdbAuth = (pathWithQuery) => {
  if (API_KEY) {
    const separator = pathWithQuery.includes('?') ? '&' : '?';
    return `${API_BASE_URL}${pathWithQuery}${separator}api_key=${encodeURIComponent(API_KEY)}`;
  }

  if (API_BEARER_TOKEN) {
    return `${API_BASE_URL}${pathWithQuery}`;
  }

  throw new Error('Missing TMDB credentials. Set VITE_TMDB_API_KEY or VITE_TMDB_BEARER_TOKEN in environment variables.');
};

const fetchTmdbJson = async (endpoint) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TMDB_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, { ...API_OPTIONS, signal: controller.signal });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch movies (${response.status}): ${errorText || response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('TMDB request timed out. Check internet, VPN, proxy, or firewall and try again.');
    }

    if (error instanceof TypeError) {
      throw new Error('Network error reaching TMDB. Please check your internet connection and try again.');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const App = () => {

  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [movieList, setMovieList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debounceSearchTerm, setDebouncedSearchTerm] = useState('');
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useDebounce( 
     () => setDebouncedSearchTerm(searchTerm), 
     500, 
     [searchTerm]
  );
  
  const fetchMovies = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const endpoint = debounceSearchTerm 
      ? withTmdbAuth(`/search/movie?query=${encodeURIComponent(debounceSearchTerm)}`)
      : withTmdbAuth('/discover/movie?sort_by=popularity.desc');

      const data = await fetchTmdbJson(endpoint);

      if (!data.results || data.results.length === 0) {
        setErrorMessage('No movies found');
        setMovieList([]);
        return;        
      }

      setMovieList(data.results || []);

      if(debounceSearchTerm && data.results.length > 0){
        await updateSearchCount(debounceSearchTerm, data.results[0]);
      }

    } catch (error) {
      console.log(`Error fetching movies: ${error}`);
      setErrorMessage(error?.message || 'Error fetching movies. Please try again later..');
    } finally {
      setIsLoading(false)
    }
  }

  const loadTrendingMovies = async () => {
    try {
      const movies = await getTrendingMovies();
      setTrendingMovies(movies || []);
    } catch (error) {
      console.error('Error loading trending movies:', error);
      setTrendingMovies([]);
    }
  }

  useEffect(() => {
    fetchMovies();
  }
  , [debounceSearchTerm])

  useEffect(() => {
    const pingAppwrite = async () => {
      if (!isAppwriteReady) return;

      try {
        await client.ping();
        console.log('Appwrite connection successful');
      } catch (error) {
        console.error('Appwrite ping failed:', error);
      }
    };
    pingAppwrite();
  }, [])


  useEffect(() => {
    loadTrendingMovies()
  }, [])
  

  useEffect(() => {
    if (!selectedMovieId) return;

    const fetchMovieDetails = async () => {
      try {
        const data = await fetchTmdbJson(withTmdbAuth(`/movie/${selectedMovieId}`));
        setMovieDetails(data);
      } 
      catch (error){
        console.log("Failed to fetch movie details", error)
      }
    };

    fetchMovieDetails();
  }, [selectedMovieId]);


  return (
    <>
      <NavBar />
      <main>
        <div />
        <div className = "wrapper">
          <header>
            <img src = "./hero-img.png" alt="Movies Banner"/>
            <h1>Curated <span className="text-gradient">Movies</span> You’ll Discover and Experience Seamlessly</h1>
          </header>

        <Search 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm} 
        />

        {trendingMovies.length > 0 && (
          <section className='trending'>
            <h2>Trending Movies</h2>
            <ul>
              {trendingMovies.map((movie, index) => (
                <li key={movie.$id}>
                  <p>{index+1}</p>
                  <img src={movie.poster_url} alt={movie.title}/>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className='all-movies'>
          <h2>All Movies</h2>

        {isLoading ? (
          <Spinner/>
        ) : errorMessage ? (
          <p className="text-red-500">{errorMessage}</p>
        ) : (
          <ul>
            {movieList.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onClick={() => {
                    setSelectedMovieId(movie.id);
                    setIsModalOpen(true);
                  }}
                />
              ))}
          </ul>
        )}

        </section>
        <MovieModel
          isOpen={isModalOpen}
          movie={movieDetails}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedMovieId(null);
            setMovieDetails(null);
          }}
        />

      </div>
    </main>
    </>
  )
}

export default App

// Before Adding Redux