import multer from 'multer';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Only JPEG, PNG and WebP images are allowed');
    error.status = 400;
    cb(error, false);
  }
};

const multerInstance = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 4,
  },
  fileFilter,
});

export const uploadImages = (req, res, next) => {
  multerInstance.array('images', 4)(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 2 MB' });
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ message: 'A listing can have at most 4 images' });
      }
      return res.status(400).json({ message: err.message || 'File upload failed' });
    }
    next();
  });
};

const singleAvatarMulter = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
});

export const uploadSingleAvatar = (req, res, next) => {
  singleAvatarMulter.single('avatar')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Avatar image too large. Maximum size is 2 MB' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ message: 'Expected a single file in "avatar" field' });
      }
      return res.status(400).json({ message: err.message || 'Avatar upload failed' });
    }
    next();
  });
};

