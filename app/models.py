from app import db
from datetime import datetime

class Organigrama(db.Model):
    """
    Modelo para almacenar organigramas completos
    """
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)  # Nombre del organigrama
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relación con los nodos y conexiones que pertenecen a este organigrama
    nodos = db.relationship('Node', backref='organigrama', lazy='dynamic', cascade='all, delete-orphan')
    conexiones = db.relationship('Connection', backref='organigrama', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }

class Node(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    node_type = db.Column(db.String(20), nullable=False, default='direct')
    position_x = db.Column(db.Float, nullable=False, default=0)
    position_y = db.Column(db.Float, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    organigrama_id = db.Column(db.Integer, db.ForeignKey('organigrama.id'), nullable=False)  # Nuevo campo
    
    # Relación con el organigrama al que pertenece este nodo
    organigrama_id = db.Column(db.Integer, db.ForeignKey('organigrama.id'), nullable=False)
    
    # Relaciones que parten de este nodo
    outgoing_connections = db.relationship('Connection', 
                                         foreign_keys='Connection.source_id',
                                         backref='source_node', 
                                         lazy='dynamic',
                                         cascade='all, delete-orphan')
    
    # Relaciones que llegan a este nodo
    incoming_connections = db.relationship('Connection', 
                                         foreign_keys='Connection.target_id',
                                         backref='target_node', 
                                         lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'nodeType': self.node_type,
            'positionX': self.position_x,
            'positionY': self.position_y,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
            'organigramaId': self.organigrama_id
        }

class Connection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    source_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    target_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    connection_type = db.Column(db.String(20), nullable=False, default='direct')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    organigrama_id = db.Column(db.Integer, db.ForeignKey('organigrama.id'), nullable=False)  # Nuevo campo
    
    # Relación con el organigrama al que pertenece esta conexión
    organigrama_id = db.Column(db.Integer, db.ForeignKey('organigrama.id'), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'sourceId': self.source_id,
            'targetId': self.target_id,
            'connectionType': self.connection_type,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat(),
            'organigramaId': self.organigrama_id
        }