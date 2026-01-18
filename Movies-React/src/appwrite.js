import { Client, Account, Databases, Query, ID } from "appwrite";

const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;

console.log(PROJECT_ID, DATABASE_ID, COLLECTION_ID)

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || "https://sfo.cloud.appwrite.io/v1")
    .setProject(PROJECT_ID);

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };

export const updateSearchCount = async(searchTerm, movie) => {
    try {
        const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [Query.equal('searchTerm', searchTerm)])
        
        if (result.documents.length > 0){
            const doc = result.documents[0]

            await databases.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, { count: doc.count + 1 })
        } else {
            await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
                searchTerm, 
                count: 1, 
                movie_id: movie.id, 
                poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            })
        }
    } catch (error) {
        console.error('Error updating search count:', error);
    }
}

export const getTrendingMovies = async () => { 
    try{
        const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
            Query.limit(5),
            Query.orderDesc("count")
        ])
        return result.documents;
    }catch(error){
        console.error('Error fetching trending movies:', error);
    }
}