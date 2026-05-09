import { Client, Account, Databases, Query, ID } from "appwrite";

const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;
const isAppwriteReady = Boolean(PROJECT_ID && DATABASE_ID && COLLECTION_ID);

let appwriteCollectionUnavailable = false;

const isMissingCollectionError = (error) =>
    error?.code === 404 && typeof error?.message === 'string' && error.message.includes('Collection with the requested ID');

const client = new Client().setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || "https://sfo.cloud.appwrite.io/v1");

if (PROJECT_ID) {
    client.setProject(PROJECT_ID);
}

const account = PROJECT_ID ? new Account(client) : null;
const databases = PROJECT_ID ? new Databases(client) : null;

export { client, account, databases, isAppwriteReady };

export const updateSearchCount = async(searchTerm, movie) => {
    if (!databases || !isAppwriteReady || appwriteCollectionUnavailable) {
        return;
    }

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
        if (isMissingCollectionError(error)) {
            appwriteCollectionUnavailable = true;
            console.warn('Appwrite trending disabled: configured collection was not found.');
            return;
        }

        console.error('Error updating search count:', error);
    }
}

export const getTrendingMovies = async () => { 
    if (!databases || !isAppwriteReady || appwriteCollectionUnavailable) {
        return [];
    }

    try{
        const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
            Query.limit(5),
            Query.orderDesc("count")
        ])
        return result.documents;
    }catch(error){
        if (isMissingCollectionError(error)) {
            appwriteCollectionUnavailable = true;
            console.warn('Appwrite trending disabled: configured collection was not found.');
            return [];
        }

        console.error('Error fetching trending movies:', error);
        return [];
    }
}