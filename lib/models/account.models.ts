import { Model, model, models, Schema } from "mongoose";

const AccountSchema:Schema<IAccount> = new Schema({
    accountName: {
        type: String,
        required: true,
        trim: true,
        minlength: [3, "Account name should be at least 3 characters long."]
    },
    balance: {
        type: Number,
        default: 0,
        min: [0, "Balance cannot be less than 0."],
        validate: {
            validator: (value: number) => value >= 0,
            message: "Balance cannot be negative."
        }
    },
    deposits: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Income',
            default:[]
        }
    ],
    expenses: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Expense',
            default:[]
        }
    ],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
    },
    mod_flag: {
        type: Boolean,
        default: false,
    },
    del_flag: {
        type: Boolean,
        default: false,
    },
    modifiedBy: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        default: null,
    },
    deletedBy: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        default: null,
    },
    action_type: {
        type: String,
        default: null,
    }
}, {
    timestamps: true,
    versionKey: false,
    minimize: false,
});

type AccountModel = Model<IAccount>
// Create or retrieve the Imodel
const Account:AccountModel = models.Account || model<IAccount>("Account", AccountSchema);

export default Account;
