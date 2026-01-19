import React from 'react'
import Search from './components/Search'
import Spinner from './components/Spinner'
import MovieCard from './components/MovieCard'
import NavBar from './components/NavBar'
import MovieModel from './components/MovieModel'
import { useState } from 'react'
import { useEffect } from 'react'
import { useDebounce } from 'react-use'
import { client, updateSearchCount, getTrendingMovies } from './appwrite.js'

const API_BASE_URL = 'https://api.themoviedb.org/3';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

const API_OPTIONS = {
  method: 'GET'
}

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
      ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(debounceSearchTerm)}&api_key=${API_KEY}`
      : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc&api_key=${API_KEY}`;

      const response = await fetch(endpoint, API_OPTIONS);

      if(!response.ok) {
        throw new Error('Failed to fetch movies');
      }

      const data = await response.json();

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
      setErrorMessage('Error fetching movies. Please try again later..');
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
        const res = await fetch(
          `${API_BASE_URL}/movie/${selectedMovieId}?api_key=${API_KEY}`
        );

        const data = await res.json();
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


