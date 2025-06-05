import { DataTypes, Model } from 'sequelize';
import sequelize from '../conection';

class Shipment extends Model {
  public id_shipment!: number;
  public id_transaction?: number;
  public id_barter?: number;
  public tracking_number?: string;
  public carrier: string = 'servientrega';
  public status: 'pendiente' | 'en_transito' | 'entregado' | 'devuelto' = 'pendiente';
  public sender_address?: string;
  public receiver_address?: string;
  public estimated_delivery?: Date;
  public actual_delivery?: Date;
  public tracking_events?: string;
  public created_at!: Date;
  public updated_at!: Date;
}

Shipment.init({
  id_shipment: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_transaction: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'transactions',
      key: 'id_transaction'
    }
  },
  id_barter: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'barters',
      key: 'id_barter'
    }
  },
  tracking_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true
  },
  carrier: {
    type: DataTypes.STRING(50),
    defaultValue: 'servientrega'
  },
  status: {
    type: DataTypes.ENUM('pendiente', 'en_transito', 'entregado', 'devuelto'),
    defaultValue: 'pendiente'
  },
  sender_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  receiver_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  estimated_delivery: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actual_delivery: {
    type: DataTypes.DATE,
    allowNull: true
  },
  tracking_events: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON string with tracking events history'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  tableName: 'shipments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default Shipment;