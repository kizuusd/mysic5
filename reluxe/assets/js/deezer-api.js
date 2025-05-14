// Deezer API Integration

// Multiple CORS Proxy untuk mengatasi masalah CORS saat mengakses API Deezer
const CORS_PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
    'https://corsanywhere.herokuapp.com/'
];
let currentProxyIndex = 0;
const DEEZER_API = 'https://api.deezer.com';

// Fungsi untuk mendapatkan proxy yang aktif
function getActiveProxy() {
    return CORS_PROXIES[currentProxyIndex];
}

// Fungsi untuk beralih ke proxy berikutnya jika yang saat ini gagal
function switchToNextProxy() {
    currentProxyIndex = (currentProxyIndex + 1) % CORS_PROXIES.length;
    console.log(`Switching to proxy: ${getActiveProxy()}`);
    return getActiveProxy();
}

// Class untuk mengelola API Deezer
class DeezerAPI {
    constructor() {
        this.tracks = [];
        this.currentQuery = '';
    }

    // Mencari lagu berdasarkan query dengan retry mechanism
    async searchTracks(query, retryCount = 0) {
        if (!query || query.trim() === '') {
            // Jika query kosong, gunakan chart
            return this.getTopTracks();
        }

        this.currentQuery = query;
        const proxy = getActiveProxy();
        const url = `${proxy}${encodeURIComponent(DEEZER_API + '/search?q=' + encodeURIComponent(query))}`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message || 'Error mengambil data dari Deezer');
            }
            
            // Transformasi data ke format yang dibutuhkan aplikasi
            this.tracks = data.data.map((track, index) => ({
                id: track.id,
                title: track.title,
                artist: track.artist.name,
                duration: this.formatDuration(track.duration),
                cover: track.album.cover_medium || './assets/images/fallback.svg',
                audioSrc: track.preview
            }));
            
            return this.tracks;
        } catch (error) {
            console.error('Error searching tracks:', error);
            
            // Jika masih ada proxy yang tersisa dan belum mencapai batas percobaan
            if (retryCount < CORS_PROXIES.length - 1) {
                console.log(`Retry ${retryCount + 1} with different proxy`);
                switchToNextProxy();
                return this.searchTracks(query, retryCount + 1);
            }
            
            // Jika semua proxy gagal, gunakan data dummy sebagai fallback
            console.log('All proxies failed, using fallback data');
            return this.getFallbackTracks();
        }
    }

    // Mendapatkan top tracks dengan proxy failover
    async getTopTracks(retryCount = 0) {
        const proxy = getActiveProxy();
        const url = `${proxy}${encodeURIComponent(DEEZER_API + '/chart/0/tracks')}`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message || 'Error mengambil data dari Deezer');
            }
            
            // Transformasi data ke format yang dibutuhkan aplikasi
            this.tracks = data.data.map((track, index) => ({
                id: track.id,
                title: track.title,
                artist: track.artist.name,
                duration: this.formatDuration(track.duration),
                cover: track.album.cover_medium || './assets/images/fallback.svg',
                audioSrc: track.preview
            }));
            
            return this.tracks;
        } catch (error) {
            console.error('Error fetching top tracks:', error);
            
            // Jika masih ada proxy yang tersisa dan belum mencapai batas percobaan
            if (retryCount < CORS_PROXIES.length - 1) {
                console.log(`Retry ${retryCount + 1} with different proxy`);
                switchToNextProxy();
                return this.getTopTracks(retryCount + 1);
            }
            
            // Jika semua proxy gagal, gunakan data dummy sebagai fallback
            console.log('All proxies failed, using fallback data');
            return this.getFallbackTracks();
        }
    }

    // Data fallback jika semua API proxy gagal
    getFallbackTracks() {
        return [
            {
                id: 1,
                title: "Offline Mode - Lagu Demo 1",
                artist: "Mysic",
                duration: "0:30",
                cover: "./assets/images/fallback.svg",
                audioSrc: ""
            },
            {
                id: 2,
                title: "Offline Mode - Lagu Demo 2",
                artist: "Mysic",
                duration: "0:30",
                cover: "./assets/images/fallback.svg",
                audioSrc: ""
            },
            {
                id: 3,
                title: "Offline Mode - Lagu Demo 3",
                artist: "Mysic",
                duration: "0:30",
                cover: "./assets/images/fallback.svg",
                audioSrc: ""
            }
        ];
    }

    // Format durasi dari detik ke format mm:ss
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    // Mendapatkan detail lagu berdasarkan ID
    async getTrackById(id, retryCount = 0) {
        const track = this.tracks.find(t => t.id === id);
        if (track) return track;
        
        // Jika tidak ditemukan di cache, ambil dari API
        const proxy = getActiveProxy();
        const url = `${proxy}${encodeURIComponent(DEEZER_API + '/track/' + id)}`;
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message || 'Error mengambil data lagu');
            }
            
            return {
                id: data.id,
                title: data.title,
                artist: data.artist.name,
                duration: this.formatDuration(data.duration),
                cover: data.album.cover_medium || './assets/images/fallback.svg',
                audioSrc: data.preview
            };
        } catch (error) {
            console.error('Error fetching track by ID:', error);
            
            // Jika masih ada proxy yang tersisa dan belum mencapai batas percobaan
            if (retryCount < CORS_PROXIES.length - 1) {
                console.log(`Retry ${retryCount + 1} with different proxy`);
                switchToNextProxy();
                return this.getTrackById(id, retryCount + 1);
            }
            
            // Jika semua proxy gagal, kembalikan track dummy
            return {
                id: id,
                title: "Offline Mode - Track Not Available",
                artist: "Mysic",
                duration: "0:30",
                cover: "./assets/images/fallback.svg",
                audioSrc: ""
            };
        }
    }
}

// Inisialisasi Deezer API
const deezerAPI = new DeezerAPI();

// Mendapatkan elemen-elemen DOM untuk pencarian
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    // Memuat top tracks saat halaman dimuat
    deezerAPI.getTopTracks()
        .then(tracks => {
            if (typeof updatePlaylist === 'function') {
                updatePlaylist(tracks);
            }
        });
    
    // Event listener untuk tombol pencarian
    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
    
    // Event listener untuk input pencarian (saat Enter ditekan)
    if (searchInput) {
        searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    // Fungsi untuk melakukan pencarian
    function performSearch() {
        const query = searchInput.value.trim();
        
        // Tampilkan loading indicator
        const playlistContainer = document.getElementById('playlist-container');
        if (playlistContainer) {
            playlistContainer.innerHTML = `
                <div class="loading-indicator">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Mencari lagu "${query}"...</p>
                </div>
            `;
        }
        
        // Lakukan pencarian
        deezerAPI.searchTracks(query)
            .then(tracks => {
                if (typeof updatePlaylist === 'function') {
                    updatePlaylist(tracks);
                }
            });
    }
}); 