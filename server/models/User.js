import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Painting' }],
    viewHistory: [
      {
        painting: { type: mongoose.Schema.Types.ObjectId, ref: 'Painting' },
        viewedAt: { type: Date, default: Date.now }
      }
    ],
    searchHistory: [
      {
        query: { type: String, trim: true },
        searchedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
