from flask import Blueprint, render_template, request, jsonify
from app import db
from app.models import Node, Connection

main = Blueprint('main', __name__)

@main.route('/')
def index():
    """Página principal de la aplicación"""
    return render_template('index.html')

# API para nodos
@main.route('/api/nodes', methods=['GET'])
def get_nodes():
    """Obtener todos los nodos"""
    nodes = Node.query.all()
    return jsonify([node.to_dict() for node in nodes])

@main.route('/api/nodes', methods=['POST'])
def create_node():
    """Crear un nuevo nodo"""
    data = request.json
    
    node = Node(
        title=data.get('title'),
        description=data.get('description'),
        node_type=data.get('nodeType', 'direct'),
        position_x=data.get('positionX', 0),
        position_y=data.get('positionY', 0)
    )
    
    db.session.add(node)
    db.session.commit()
    
    return jsonify(node.to_dict()), 201

@main.route('/api/nodes/<int:node_id>', methods=['GET'])
def get_node(node_id):
    """Obtener un nodo específico"""
    node = Node.query.get_or_404(node_id)
    return jsonify(node.to_dict())

@main.route('/api/nodes/<int:node_id>', methods=['PUT'])
def update_node(node_id):
    """Actualizar un nodo existente"""
    node = Node.query.get_or_404(node_id)
    data = request.json
    
    node.title = data.get('title', node.title)
    node.description = data.get('description', node.description)
    node.node_type = data.get('nodeType', node.node_type)
    node.position_x = data.get('positionX', node.position_x)
    node.position_y = data.get('positionY', node.position_y)
    
    db.session.commit()
    
    return jsonify(node.to_dict())

@main.route('/api/nodes/<int:node_id>', methods=['DELETE'])
def delete_node(node_id):
    """Eliminar un nodo"""
    node = Node.query.get_or_404(node_id)
    db.session.delete(node)
    db.session.commit()
    
    return jsonify({'message': 'Nodo eliminado correctamente'}), 200

# API para conexiones
@main.route('/api/connections', methods=['GET'])
def get_connections():
    """Obtener todas las conexiones"""
    connections = Connection.query.all()
    return jsonify([connection.to_dict() for connection in connections])

@main.route('/api/connections', methods=['POST'])
def create_connection():
    """Crear una nueva conexión entre nodos"""
    data = request.json
    
    # Verificar que existan los nodos
    source_node = Node.query.get_or_404(data.get('sourceId'))
    target_node = Node.query.get_or_404(data.get('targetId'))
    
    connection = Connection(
        source_id=source_node.id,
        target_id=target_node.id,
        connection_type=data.get('connectionType', 'direct')
    )
    
    db.session.add(connection)
    db.session.commit()
    
    return jsonify(connection.to_dict()), 201

@main.route('/api/connections/<int:connection_id>', methods=['PUT'])
def update_connection(connection_id):
    """Actualizar una conexión existente"""
    connection = Connection.query.get_or_404(connection_id)
    data = request.json
    
    if 'connectionType' in data:
        connection.connection_type = data['connectionType']
    
    db.session.commit()
    
    return jsonify(connection.to_dict())

@main.route('/api/connections/<int:connection_id>', methods=['DELETE'])
def delete_connection(connection_id):
    """Eliminar una conexión"""
    connection = Connection.query.get_or_404(connection_id)
    db.session.delete(connection)
    db.session.commit()
    
    return jsonify({'message': 'Conexión eliminada correctamente'}), 200