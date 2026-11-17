import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 512 * 1024, files: 1 },
}).single('picture');

export const uploadProfilePicture = (req, res, next) => {
  upload(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, error: 'Profile picture must be 512 KB or smaller.' });
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ success: false, error: 'Upload one profile picture.' });
    }
    next(error);
  });
};
