const axios = require('axios');

const getLiveCoinPrices = async (req, res) => {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'bitcoin,ethereum,tether',
        vs_currencies: 'usd,ngn',
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Failed to fetch coin prices:', error.message);
    res.status(500).json({ error: 'Unable to fetch coin prices' });
  }
};

module.exports = {
  //addCoin,
  //updateCoin,
  //deleteCoin,
  //getCoins,
  //getEnabledCoins,
  getLiveCoinPrices, // ✅ Add this
};
