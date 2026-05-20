function getHealth(req, res) {
  res.json({ status: 'ok', message: 'SmartMushFarm API is healthy' });
}

module.exports = { getHealth };