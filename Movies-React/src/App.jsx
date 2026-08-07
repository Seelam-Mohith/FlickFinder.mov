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

const API_BASE_URL = 'https://api.tvmaze.com';

const API_TIMEOUT_MS = 12000;

const mapShow = (show) => ({
  id: show.id,
  title: show.name,
  posterUrl: show.image?.original || show.image?.medium || null,
  vote_average: show.rating?.average ?? 0,
  release_date: show.premiered,
  original_language: show.language,
  overview: show.summary ? show.summary.replace(/<[^>]+>/g, '').trim() : '',
  runtime: show.runtime,
  genres: show.genres || [],
  homepage: show.officialSite || show.url || null,
});

const fetchTvmazeJson = async (endpoint) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, { signal: controller.signal });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch shows (${response.status}): ${errorText || response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('TVMaze request timed out. Check internet, VPN, proxy, or firewall and try again.');
    }

    if (error instanceof TypeError) {
      throw new Error('Network error reaching TVMaze. Please check your internet connection and try again.');
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
  
  const fetchShows = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = debounceSearchTerm
        ? await fetchTvmazeJson(`${API_BASE_URL}/search/shows?q=${encodeURIComponent(debounceSearchTerm)}`)
        : await fetchTvmazeJson(`${API_BASE_URL}/shows?page=0`);

      const rawShows = debounceSearchTerm ? (data || []).map(item => item?.show) : (data || []);
      const shows = rawShows.filter(Boolean).map(mapShow);

      if (shows.length === 0) {
        setErrorMessage('No shows found');
        setMovieList([]);
        return;
      }

      setMovieList(shows);

      if (debounceSearchTerm && shows.length > 0) {
        await updateSearchCount(debounceSearchTerm, shows[0]);
      }

    } catch (error) {
      console.log(`Error fetching shows: ${error}`);
      setErrorMessage(error?.message || 'Error fetching shows. Please try again later..');
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
    fetchShows();
  }
  , [debounceSearchTerm])

  useEffect(() => {
    const pingAppwrite = async () => {
      if (!isAppwriteReady) return;

      try {
        await client.ping();
        console.log('Appwrite connection successful');
      } catch (error) {
        if (typeof error?.message === 'string' && error.message.includes('Project is paused')) {
          console.warn('Appwrite project is paused; trending/search tracking disabled. Restore it from the Appwrite console to re-enable.');
          return;
        }
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

    const fetchShowDetails = async () => {
      try {
        const data = await fetchTvmazeJson(`${API_BASE_URL}/shows/${selectedMovieId}`);
        setMovieDetails(mapShow(data));
      } 
      catch (error){
        console.log("Failed to fetch show details", error)
      }
    };

    fetchShowDetails();
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