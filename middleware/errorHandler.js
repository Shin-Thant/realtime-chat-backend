const errorHandler = (err, req, res, next) => {
	console.log(err);

	const status = res?.statusCode || 500;
	res.status(status).json({ message: err.message });
};

module.exports = errorHandler;
