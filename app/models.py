from app import db
from datetime import datetime

class Node(db.Model):
    """
    Modelo para los nodos del organigrama (cargos/posiciones)
    """
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)  # Título/nombre del cargo
    description = db.Column(db.Text, nullable=True)  # Descripción opcional
    node_type = db.Column(db.String(20), nullable=False, default='direct')  # direct o advisory
    position_x = db.Column(db.Float, nullable=False, default=0)  # Posición X en el canvas
    position_y = db.Column(db.Float, nullable=False, default=0)  # Posición Y en el canvas
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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
            'updatedAt': self.updated_at.isoformat()
        }

class Connection(db.Model):
    """
    Modelo para las conexiones entre nodos
    """
    id = db.Column(db.Integer, primary_key=True)
    source_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    target_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    connection_type = db.Column(db.String(20), nullable=False, default='direct')  # direct o advisory
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'sourceId': self.source_id,
            'targetId': self.target_id,
            'connectionType': self.connection_type,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }