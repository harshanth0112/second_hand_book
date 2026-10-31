const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const isbnCache = new Map();

export class IsbnService {
  static getCache() {
    return isbnCache;
  }

  static async lookup(rawIsbn) {
    const cleanIsbn = rawIsbn.replace(/[-\s]/g, '');

    // Check in-memory cache
    const cached = isbnCache.get(cleanIsbn);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanIsbn}&jscmd=data&format=json`;

    let response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });
    } catch (err) {
      const error = new Error('Upstream ISBN service failure or timeout');
      error.status = 502;
      throw error;
    }

    if (!response.ok) {
      const error = new Error('Upstream ISBN service returned an error');
      error.status = 502;
      throw error;
    }

    const data = await response.json().catch(() => null);
    const bookData = data?.[`ISBN:${cleanIsbn}`];

    if (!bookData) {
      const error = new Error('Book not found for this ISBN');
      error.status = 404;
      throw error;
    }

    const title = bookData.title || '';
    const author = (bookData.authors && bookData.authors.length > 0)
      ? bookData.authors.map((a) => a.name).join(', ')
      : '';
    const coverUrl = bookData.cover?.medium || bookData.cover?.large || bookData.cover?.small || '';

    const result = {
      title,
      author,
      coverUrl,
    };

    // Store in cache
    isbnCache.set(cleanIsbn, {
      data: result,
      timestamp: Date.now(),
    });

    return result;
  }
}

