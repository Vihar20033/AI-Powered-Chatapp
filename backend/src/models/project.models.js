import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
    {
        name:{
            type: String,
            required: true,
            trim: true,
            unique: [true, "Project name must be unique"],
            lowercase: true,
            },

        users:[
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            }
        ]


    }
    ,{timestamps: true}
);

export const Project = mongoose.model('Project', projectSchema);