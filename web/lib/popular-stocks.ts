// Popular IDX stocks for quick pick
export interface PopularStock {
  ticker: string; // Yahoo Finance format
  code: string; // Display code without .JK
  name: string;
  sector: string;
}

export const POPULAR_STOCKS: PopularStock[] = [
  // Perbankan
  { ticker: "BBCA.JK", code: "BBCA", name: "Bank Central Asia", sector: "Perbankan" },
  { ticker: "BBRI.JK", code: "BBRI", name: "Bank Rakyat Indonesia", sector: "Perbankan" },
  { ticker: "BMRI.JK", code: "BMRI", name: "Bank Mandiri", sector: "Perbankan" },
  { ticker: "BBNI.JK", code: "BBNI", name: "Bank Negara Indonesia", sector: "Perbankan" },
  { ticker: "BRIS.JK", code: "BRIS", name: "Bank Syariah Indonesia", sector: "Perbankan" },

  // Telekomunikasi
  { ticker: "TLKM.JK", code: "TLKM", name: "Telekomunikasi Indonesia", sector: "Telekomunikasi" },
  { ticker: "ISAT.JK", code: "ISAT", name: "Indosat", sector: "Telekomunikasi" },
  { ticker: "EXCL.JK", code: "EXCL", name: "XL Axiata", sector: "Telekomunikasi" },

  // Konsumer
  { ticker: "UNVR.JK", code: "UNVR", name: "Unilever Indonesia", sector: "Konsumer" },
  { ticker: "ICBP.JK", code: "ICBP", name: "Indofood CBP", sector: "Konsumer" },
  { ticker: "INDF.JK", code: "INDF", name: "Indofood Sukses Makmur", sector: "Konsumer" },
  { ticker: "MYOR.JK", code: "MYOR", name: "Mayora Indah", sector: "Konsumer" },
  { ticker: "KLBF.JK", code: "KLBF", name: "Kalbe Farma", sector: "Konsumer" },
  { ticker: "SIDO.JK", code: "SIDO", name: "Industri Jamu Sido Muncul", sector: "Konsumer" },

  // Otomotif
  { ticker: "ASII.JK", code: "ASII", name: "Astra International", sector: "Otomotif" },
  { ticker: "AUTO.JK", code: "AUTO", name: "Astra Otoparts", sector: "Otomotif" },
  { ticker: "UNTR.JK", code: "UNTR", name: "United Tractors", sector: "Otomotif" },

  // Pertambangan
  { ticker: "ANTM.JK", code: "ANTM", name: "Aneka Tambang", sector: "Pertambangan" },
  { ticker: "PTBA.JK", code: "PTBA", name: "Bukit Asam", sector: "Pertambangan" },
  { ticker: "ADRO.JK", code: "ADRO", name: "Adaro Energy", sector: "Pertambangan" },
  { ticker: "ITMG.JK", code: "ITMG", name: "Indo Tambangraya Megah", sector: "Pertambangan" },
  { ticker: "MEDC.JK", code: "MEDC", name: "Medco Energi", sector: "Pertambangan" },
  { ticker: "INCO.JK", code: "INCO", name: "Vale Indonesia", sector: "Pertambangan" },
  { ticker: "AMMN.JK", code: "AMMN", name: "Amman Mineral", sector: "Pertambangan" },
  { ticker: "MDKA.JK", code: "MDKA", name: "Merdeka Copper Gold", sector: "Pertambangan" },

  // Properti
  { ticker: "BSDE.JK", code: "BSDE", name: "Bumi Serpong Damai", sector: "Properti" },
  { ticker: "PWON.JK", code: "PWON", name: "Pakuwon Jati", sector: "Properti" },
  { ticker: "CTRA.JK", code: "CTRA", name: "Ciputra Development", sector: "Properti" },
  { ticker: "SMGR.JK", code: "SMGR", name: "Semen Indonesia", sector: "Properti" },
  { ticker: "INTP.JK", code: "INTP", name: "Indocement Tunggal Prakarsa", sector: "Properti" },

  // Ritel
  { ticker: "MAPI.JK", code: "MAPI", name: "Mitra Adiperkasa", sector: "Ritel" },
  { ticker: "ACES.JK", code: "ACES", name: "Ace Hardware Indonesia", sector: "Ritel" },
  { ticker: "AMRT.JK", code: "AMRT", name: "Sumber Alfaria Trijaya", sector: "Ritel" },

  // Tech
  { ticker: "GOTO.JK", code: "GOTO", name: "GoTo Gojek Tokopedia", sector: "Teknologi" },
  { ticker: "EMTK.JK", code: "EMTK", name: "Elang Mahkota Teknologi", sector: "Teknologi" },
  { ticker: "BRPT.JK", code: "BRPT", name: "Barito Pacific", sector: "Teknologi" },
  { ticker: "TPIA.JK", code: "TPIA", name: "Chandra Asri Pacific", sector: "Teknologi" },
];

export function getStockByCode(code: string): PopularStock | undefined {
  const normalized = code.toUpperCase().replace(".JK", "");
  return POPULAR_STOCKS.find((s) => s.code === normalized);
}

export function getStocksBySector(): Record<string, PopularStock[]> {
  return POPULAR_STOCKS.reduce(
    (acc, stock) => {
      if (!acc[stock.sector]) acc[stock.sector] = [];
      acc[stock.sector].push(stock);
      return acc;
    },
    {} as Record<string, PopularStock[]>,
  );
}

export const SECTORS = Array.from(new Set(POPULAR_STOCKS.map((s) => s.sector)));
