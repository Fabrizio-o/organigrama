from flask import Blueprint, render_template, request, jsonify
from app import db
from app.models import Node, Connection, Organigrama

main = Blueprint('main', __name__)

@main.route('/')
def index():
    """Página principal de la aplicación"""
    return render_template('index.html')

# API para organigramas
@main.route('/api/organigramas', methods=['GET'])
def get_organigramas():
    """Obtener todos los organigramas"""
    organigramas = Organigrama.query.all()
    return jsonify([organigrama.to_dict() for organigrama in organigramas])

@main.route('/api/organigramas', methods=['POST'])
def create_organigrama():
    """Crear un nuevo organigrama"""
    data = request.json
    
    organigrama = Organigrama(
        nombre=data.get('nombre', 'Nuevo Organigrama')
    )
    
    db.session.add(organigrama)
    db.session.commit()
    
    return jsonify(organigrama.to_dict()), 201

@main.route('/api/organigramas/<int:organigrama_id>', methods=['GET'])
def get_organigrama(organigrama_id):
    """Obtener un organigrama específico con sus nodos y conexiones"""
    organigrama = Organigrama.query.get_or_404(organigrama_id)

    # Obtener todos los nodos y conexiones asociados a este organigrama
    nodos = [nodo.to_dict() for nodo in organigrama.nodos]
    conexiones = [conexion.to_dict() for conexion in organigrama.conexiones]

    return jsonify({
        'organigrama': organigrama.to_dict(),
        'nodos': nodos,
        'conexiones': conexiones
    })

@main.route('/api/organigramas/<int:organigrama_id>', methods=['DELETE'])
def delete_organigrama(organigrama_id):
    """Eliminar un organigrama y todos sus nodos y conexiones asociados"""
    organigrama = Organigrama.query.get_or_404(organigrama_id)
    
    db.session.delete(organigrama)
    db.session.commit()
    
    return jsonify({'message': 'Organigrama eliminado correctamente'}), 200

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
        position_y=data.get('positionY', 0),
        organigrama_id=data.get('organigramaId')  # Asegúrate de que este campo esté presente
    )
    
    db.session.add(node)
    db.session.commit()
    
    return jsonify(node.to_dict()), 201
    
    # Verificar que el organigrama exista
    organigrama = Organigrama.query.get_or_404(data.get('organigramaId'))
    
    node = Node(
        title=data.get('title'),
        description=data.get('description'),
        node_type=data.get('nodeType', 'direct'),
        position_x=data.get('positionX', 0),
        position_y=data.get('positionY', 0),
        organigrama_id=organigrama.id
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
    """Eliminar un nodo y sus conexiones asociadas"""
    node = Node.query.get_or_404(node_id)

    # Eliminar todas las conexiones asociadas a este nodo (como source o target)
    Connection.query.filter((Connection.source_id == node_id) | (Connection.target_id == node_id)).delete()

    # Eliminar el nodo
    db.session.delete(node)
    db.session.commit()

    return jsonify({'message': 'Nodo y conexiones asociadas eliminados correctamente'}), 200

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
    
    # Verificar que existan los nodos y que pertenezcan al mismo organigrama
    source_node = Node.query.get_or_404(data.get('sourceId'))
    target_node = Node.query.get_or_404(data.get('targetId'))
    
    if source_node.organigrama_id != target_node.organigrama_id:
        return jsonify({'error': 'Los nodos deben pertenecer al mismo organigrama'}), 400
    
    connection = Connection(
        source_id=source_node.id,
        target_id=target_node.id,
        connection_type=data.get('connectionType', 'direct'),
        organigrama_id=source_node.organigrama_id
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