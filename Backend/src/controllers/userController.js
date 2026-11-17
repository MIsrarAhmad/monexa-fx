import bcrypt from 'bcryptjs';
import User, { USER_GENDERS } from '../models/User.js';
import { isValidPassword, PASSWORD_REQUIREMENTS } from '../utils/passwordPolicy.js';
import { isValidCountryCode } from '../utils/countries.js';
import { isValidDateOfBirth } from '../utils/dateOfBirth.js';

const getPictureType = (buffer) => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
};

export const updateProfilePicture = async (req, res, next) => {
  try {
    const type = req.file && getPictureType(req.file.buffer);
    if (!type || type !== req.file.mimetype) {
      return res.status(400).json({ success: false, error: 'Upload a valid JPG, PNG, or WebP profile picture.' });
    }
    const user = await User.findByIdAndUpdate(req.user._id, {
      $set: { profilePicture: req.file.buffer, profilePictureType: type },
    });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.status(200).json({ success: true, message: 'Profile picture updated successfully' });
  } catch (error) {
    next(error);
  }
};

export const getProfilePicture = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+profilePicture +profilePictureType');
    if (!user?.profilePicture || !user.profilePictureType) {
      return res.status(404).json({ success: false, error: 'Profile picture not found' });
    }
    res.set('Cache-Control', 'private, no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    res.type(user.profilePictureType).send(user.profilePicture);
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, fatherName, gender, dateOfBirth, country } = req.body;
    if (fatherName !== undefined &&
        (typeof fatherName !== 'string' || !fatherName.trim() || fatherName.trim().length > 100)) {
      return res.status(400).json({ success: false, error: 'Please provide a father name of up to 100 characters' });
    }
    if (gender !== undefined && !USER_GENDERS.includes(gender)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid gender' });
    }
    if (dateOfBirth !== undefined && !isValidDateOfBirth(dateOfBirth)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid date of birth in YYYY-MM-DD format that is not in the future',
      });
    }
    if (country !== undefined && !isValidCountryCode(country)) {
      return res.status(400).json({ success: false, error: 'Please provide a valid ISO alpha-2 country code' });
    }
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (email && email.toLowerCase() !== user.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({ success: false, error: 'Email is already in use' });
      }
      user.email = email.toLowerCase();
    }

    if (name) user.name = name;
    if (fatherName !== undefined) user.fatherName = fatherName.trim();
    if (gender !== undefined) user.gender = gender;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (country !== undefined) user.country = country;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        name: user.name,
        fatherName: user.fatherName || null,
        gender: user.gender || null,
        dateOfBirth: user.dateOfBirth || null,
        country: user.country || null,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user password
// @route   PUT /api/user/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both current and new passwords',
      });
    }

    if (!isValidPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        error: PASSWORD_REQUIREMENTS,
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};