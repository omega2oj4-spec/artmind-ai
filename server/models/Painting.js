import mongoose from 'mongoose';

const paintingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    artist: { type: String, required: true, default: 'Unknown Artist', trim: true },
    dateDisplay: { type: String, default: 'Undated' },
    medium: { type: String, default: 'Oil on Canvas' },
    description: { type: String, default: '' },
    imageUrl: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: ['Abstract', 'Landscape', 'Flower', 'Nature', 'Figurative', 'Religious'],
      default: 'Abstract'
    },
    style: { type: String, default: 'Impressionism' },
    colorMedium: { type: String, default: 'Oil' },
    surface: { type: String, default: 'Canvas' },
    popularity: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    aiSummary: { type: String, default: null },
    colorTheme: { type: String, default: 'Neutral' },
    tags: [{ type: String }],
    articId: { type: Number, index: true }
  },
  { timestamps: true }
);

paintingSchema.index({ title: 'text', artist: 'text', description: 'text', style: 'text', medium: 'text' });

export default mongoose.model('Painting', paintingSchema);
