import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const KUNCI_TEMA = 'cme_tema';

function bacaTemaAwal() {
    try {
        const tersimpan = window.localStorage.getItem(KUNCI_TEMA);
        if (tersimpan === 'dark' || tersimpan === 'light') {
            return tersimpan;
        }
    } catch {
        // Penyimpanan bisa diblokir browser; pakai preferensi sistem.
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

function terapkanTema(tema) {
    document.documentElement.classList.toggle('dark', tema === 'dark');
}

/**
 * Saklar tema terang/gelap Nordic. Preferensi tersimpan di `cme_tema`;
 * tanpa simpanan mengikuti `prefers-color-scheme` dan perubahan sistem.
 */
export default function ThemeToggle() {
    const [tema, setTema] = useState(bacaTemaAwal);
    const gelap = tema === 'dark';

    useEffect(() => {
        terapkanTema(tema);
    }, [tema]);

    // Ikuti perubahan tema sistem hanya bila pengguna belum memilih manual.
    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const saatBerubah = (e) => {
            let tersimpan = null;
            try {
                tersimpan = window.localStorage.getItem(KUNCI_TEMA);
            } catch {
                // Abaikan; anggap belum ada pilihan manual.
            }
            if (!tersimpan) {
                setTema(e.matches ? 'dark' : 'light');
            }
        };
        media.addEventListener('change', saatBerubah);
        return () => media.removeEventListener('change', saatBerubah);
    }, []);

    const alihkan = () => {
        const berikutnya = gelap ? 'light' : 'dark';
        setTema(berikutnya);
        try {
            window.localStorage.setItem(KUNCI_TEMA, berikutnya);
        } catch {
            // Pilihan tetap berlaku sampai halaman ditutup.
        }
    };

    return (
        <button
            type="button"
            onClick={alihkan}
            aria-pressed={gelap}
            aria-label={gelap ? 'Alihkan ke tema terang' : 'Alihkan ke tema gelap'}
            title={gelap ? 'Tema terang' : 'Tema gelap'}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-surface/10 text-gray-500 dark:text-slate-300 hover:text-text dark:hover:text-white transition min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 focus-visible:outline-2 focus-visible:outline-primary"
        >
            {gelap ? (
                <Sun className="h-5 w-5 stroke-[1.5]" aria-hidden="true" />
            ) : (
                <Moon className="h-5 w-5 stroke-[1.5]" aria-hidden="true" />
            )}
        </button>
    );
}
