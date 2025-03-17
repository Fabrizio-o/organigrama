// Variables globales
let graph;
let paper;
let selectedElement = null;
let connectMode = false;
let sourceNode = null;

// Inicialización cuando el DOM está listo
$(document).ready(function() {
    initializeJointGraph();
    loadNodesFromServer();
    setupEventListeners();
});

// Inicializar el gráfico JointJS
function initializeJointGraph() {
    graph = new joint.dia.Graph();
    
    paper = new joint.dia.Paper({
        el: document.getElementById('organigrama'),
        model: graph,
        width: '100%',
        height: 600,
        gridSize: 10,
        drawGrid: true,
        background: {
            color: 'white'
        },
        interactive: {
            vertexAdd: false,
            vertexRemove: false
        }
    });
    
    // Eventos del papel (área de dibujo)
    paper.on('cell:pointerclick', function(cellView, evt, x, y) {
        if (connectMode && cellView.model.isElement()) {
            handleConnectionMode(cellView.model);
        } else {
            selectElement(cellView);
        }
    });
    
    paper.on('blank:pointerclick', function() {
        deselectAll();
    });
    
    // Permitir arrastrar nodos
    paper.on('element:pointerdown', function(elementView, evt) {
        // Solo permitir arrastrar con el botón izquierdo
        if (evt.button === 0) {
            elementView.model.toFront();
        }
    });
}

// Cargar nodos desde el servidor
function loadNodesFromServer() {
    $.ajax({
        url: '/api/nodes',
        type: 'GET',
        success: function(nodes) {
            // Limpiar gráfico existente
            graph.clear();
            
            // Crear nodos
            nodes.forEach(function(node) {
                createNodeShape(node);
            });
            
            // Cargar conexiones después de crear los nodos
            loadConnectionsFromServer();
        },
        error: function(error) {
            console.error('Error al cargar nodos:', error);
            alert('Error al cargar los nodos del organigrama.');
        }
    });
}

// Cargar conexiones desde el servidor
function loadConnectionsFromServer() {
    $.ajax({
        url: '/api/connections',
        type: 'GET',
        success: function(connections) {
            connections.forEach(function(connection) {
                createConnectionShape(connection);
            });
        },
        error: function(error) {
            console.error('Error al cargar conexiones:', error);
            alert('Error al cargar las conexiones del organigrama.');
        }
    });
}

// Configurar escuchadores de eventos
function setupEventListeners() {
    // Botón para añadir un nuevo nodo
    $('#btn-add-node').click(function() {
        createNewNode();
    });
    
    // Formulario de propiedades del nodo
    $('#node-form').submit(function(e) {
        e.preventDefault();
        saveNodeChanges();
    });
    
    // Botón para eliminar nodo
    $('#btn-delete-node').click(function() {
        deleteSelectedNode();
    });
    
    // Formulario de propiedades de la conexión
    $('#connection-form').submit(function(e) {
        e.preventDefault();
        saveConnectionChanges();
    });
    
    // Botón para eliminar conexión
    $('#btn-delete-connection').click(function() {
        deleteSelectedConnection();
    });
    
    // Botón para activar el modo de conexión
    $('#btn-connect-nodes').click(function() {
        openConnectionModal();
    });
    
    // Botón para crear conexión desde el modal
    $('#btn-create-connection').click(function() {
        createConnectionFromModal();
    });
    
    // Botón para guardar el organigrama completo
    $('#btn-save-diagram').click(function() {
        saveOrganigrama();
    });
}

// Crear un nuevo nodo
function createNewNode() {
    const defaultPosition = {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200
    };
    
    const newNode = {
        title: 'Nuevo cargo',
        description: 'Descripción del cargo',
        nodeType: 'direct',
        positionX: defaultPosition.x,
        positionY: defaultPosition.y
    };
    
    $.ajax({
        url: '/api/nodes',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(newNode),
        success: function(createdNode) {
            createNodeShape(createdNode);
            selectNodeById(createdNode.id);
        },
        error: function(error) {
            console.error('Error al crear nodo:', error);
            alert('Error al crear el nuevo nodo.');
        }
    });
}

// Crear la forma visual de un nodo
function createNodeShape(nodeData) {
    // Crear un nodo rectangular con JointJS
    const rect = new joint.shapes.standard.Rectangle({
        id: 'node-' + nodeData.id,
        position: { x: nodeData.positionX, y: nodeData.positionY },
        size: { width: 150, height: 60 },
        attrs: {
            body: {
                fill: nodeData.nodeType === 'direct' ? '#f8f9fa' : '#e2f0ff',
                stroke: '#2c3e50',
                strokeWidth: 2
            },
            label: {
                text: nodeData.title,
                fill: '#333',
                fontSize: 12,
                fontFamily: 'Arial, sans-serif'
            }
        },
        nodeData: nodeData  // Guardar los datos completos del nodo
    });
    
    graph.addCell(rect);
    
    // Permitir actualizar la posición cuando se mueve el nodo
    rect.on('change:position', function() {
        const position = rect.position();
        updateNodePosition(nodeData.id, position.x, position.y);
    });
    
    return rect;
}

// Crear una conexión entre nodos
function createConnectionShape(connectionData) {
    const sourceCell = graph.getCell('node-' + connectionData.sourceId);
    const targetCell = graph.getCell('node-' + connectionData.targetId);
    
    if (!sourceCell || !targetCell) {
        console.error('No se pueden encontrar los nodos para la conexión:', connectionData);
        return null;
    }
    
    // Crear una línea para la conexión utilizando JointJS
    const link = new joint.shapes.standard.Link({
        id: 'connection-' + connectionData.id,
        source: { id: sourceCell.id },
        target: { id: targetCell.id },
        router: { name: 'orthogonal' },  // Usar enrutamiento ortogonal (solo líneas horizontales y verticales)
        connector: { name: 'rounded' },
        attrs: {
            line: {
                stroke: '#2c3e50',
                strokeWidth: 2,
                strokeDasharray: connectionData.connectionType === 'advisory' ? '5,3' : 'none'
            }
        },
        connectionData: connectionData  // Guardar los datos completos de la conexión
    });
    
    graph.addCell(link);
    return link;
}

// Seleccionar un elemento (nodo o conexión)
function selectElement(cellView) {
    deselectAll();
    
    const model = cellView.model;
    selectedElement = model;
    
    // Añadir estilo visual para mostrar que está seleccionado
    if (model.isElement()) {
        // Es un nodo
        model.attr('body/stroke', '#007bff');
        model.attr('body/strokeWidth', 3);
        
        // Mostrar propiedades del nodo
        showNodeProperties(model.get('nodeData'));
    } else if (model.isLink()) {
        // Es una conexión
        model.attr('line/stroke', '#007bff');
        model.attr('line/strokeWidth', 3);
        
        // Mostrar propiedades de la conexión
        showConnectionProperties(model.get('connectionData'));
    }
}

// Mostrar el formulario con las propiedades del nodo
function showNodeProperties(nodeData) {
    $('#connection-form').addClass('d-none');
    $('#node-form').removeClass('d-none');
    
    $('#node-id').val(nodeData.id);
    $('#node-title').val(nodeData.title);
    $('#node-description').val(nodeData.description);
    $('#node-type').val(nodeData.nodeType);
}

// Mostrar el formulario con las propiedades de la conexión
function showConnectionProperties(connectionData) {
    $('#node-form').addClass('d-none');
    $('#connection-form').removeClass('d-none');
    
    $('#connection-id').val(connectionData.id);
    $('#connection-type').val(connectionData.connectionType);
}

// Deseleccionar todos los elementos
function deselectAll() {
    if (selectedElement) {
        if (selectedElement.isElement()) {
            selectedElement.attr('body/stroke', '#2c3e50');
            selectedElement.attr('body/strokeWidth', 2);
        } else if (selectedElement.isLink()) {
            selectedElement.attr('line/stroke', '#2c3e50');
            selectedElement.attr('line/strokeWidth', 2);
        }
    }
    
    selectedElement = null;
    $('#node-form').addClass('d-none');
    $('#connection-form').addClass('d-none');
}

// Guardar cambios en un nodo
function saveNodeChanges() {
    const nodeId = $('#node-id').val();
    
    const updatedNode = {
        title: $('#node-title').val(),
        description: $('#node-description').val(),
        nodeType: $('#node-type').val()
    };
    
    $.ajax({
        url: '/api/nodes/' + nodeId,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(updatedNode),
        success: function(node) {
            // Actualizar la visualización del nodo
            updateNodeVisual(node);
            alert('Nodo actualizado correctamente.');
        },
        error: function(error) {
            console.error('Error al actualizar nodo:', error);
            alert('Error al actualizar el nodo.');
        }
    });
}

// Actualizar la visualización de un nodo
function updateNodeVisual(nodeData) {
    const cell = graph.getCell('node-' + nodeData.id);
    
    if (cell) {
        cell.attr('label/text', nodeData.title);
        cell.attr('body/fill', nodeData.nodeType === 'direct' ? '#f8f9fa' : '#e2f0ff');
        cell.set('nodeData', nodeData);
    }
}

// Guardar cambios en una conexión
function saveConnectionChanges() {
    const connectionId = $('#connection-id').val();
    
    const updatedConnection = {
        connectionType: $('#connection-type').val()
    };
    
    $.ajax({
        url: '/api/connections/' + connectionId,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(updatedConnection),
        success: function(connection) {
            // Actualizar la visualización de la conexión
            updateConnectionVisual(connection);
            alert('Conexión actualizada correctamente.');
        },
        error: function(error) {
            console.error('Error al actualizar conexión:', error);
            alert('Error al actualizar la conexión.');
        }
    });
}

// Actualizar la visualización de una conexión
function updateConnectionVisual(connectionData) {
    const cell = graph.getCell('connection-' + connectionData.id);
    
    if (cell) {
        cell.attr('line/strokeDasharray', connectionData.connectionType === 'advisory' ? '5,3' : 'none');
        cell.set('connectionData', connectionData);
    }
}

// Eliminar el nodo seleccionado
function deleteSelectedNode() {
    if (!selectedElement || !selectedElement.isElement()) {
        return;
    }
    
    const nodeData = selectedElement.get('nodeData');
    
    if (confirm('¿Estás seguro de eliminar este nodo? Se eliminarán también todas sus conexiones.')) {
        $.ajax({
            url: '/api/nodes/' + nodeData.id,
            type: 'DELETE',
            success: function() {
                // El nodo se eliminará automáticamente del gráfico al recargar
                loadNodesFromServer();
                deselectAll();
                alert('Nodo eliminado correctamente.');
            },
            error: function(error) {
                console.error('Error al eliminar nodo:', error);
                alert('Error al eliminar el nodo.');
            }
        });
    }
}

// Eliminar la conexión seleccionada
function deleteSelectedConnection() {
    if (!selectedElement || !selectedElement.isLink()) {
        return;
    }
    
    const connectionData = selectedElement.get('connectionData');
    
    if (confirm('¿Estás seguro de eliminar esta conexión?')) {
        $.ajax({
            url: '/api/connections/' + connectionData.id,
            type: 'DELETE',
            success: function() {
                graph.removeCells(selectedElement);
                deselectAll();
                alert('Conexión eliminada correctamente.');
            },
            error: function(error) {
                console.error('Error al eliminar conexión:', error);
                alert('Error al eliminar la conexión.');
            }
        });
    }
}

// Actualizar posición de un nodo en el servidor
function updateNodePosition(nodeId, x, y) {
    const updatedPosition = {
        positionX: x,
        positionY: y
    };
    
    $.ajax({
        url: '/api/nodes/' + nodeId,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(updatedPosition),
        error: function(error) {
            console.error('Error al actualizar posición:', error);
        }
    });
}

// Seleccionar un nodo por su ID
function selectNodeById(nodeId) {
    const cellView = paper.findViewByModel(graph.getCell('node-' + nodeId));
    
    if (cellView) {
        selectElement(cellView);
    }
}

// Abrir modal para crear conexiones
function openConnectionModal() {
    // Cargar los nodos disponibles en los selects
    $('#source-node').empty();
    $('#target-node').empty();
    
    const nodes = graph.getElements();
    
    nodes.forEach(function(node) {
        const nodeData = node.get('nodeData');
        const option = $('<option></option>')
            .val(nodeData.id)
            .text(nodeData.title);
        
        $('#source-node').append(option.clone());
        $('#target-node').append(option);
    });
    
    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('connectionModal'));
    modal.show();
}

// Crear una conexión desde el modal
function createConnectionFromModal() {
    const sourceId = $('#source-node').val();
    const targetId = $('#target-node').val();
    const connectionType = $('#new-connection-type').val();
    
    if (sourceId === targetId) {
        alert('No se puede conectar un nodo consigo mismo.');
        return;
    }
    
    const newConnection = {
        sourceId: sourceId,
        targetId: targetId,
        connectionType: connectionType
    };
    
    $.ajax({
        url: '/api/connections',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(newConnection),
        success: function(createdConnection) {
            createConnectionShape(createdConnection);
            
            // Cerrar el modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('connectionModal'));
            modal.hide();
            
            alert('Conexión creada correctamente.');
        },
        error: function(error) {
            console.error('Error al crear conexión:', error);
            alert('Error al crear la conexión.');
        }
    });
}

// Guardar todo el organigrama
function saveOrganigrama() {
    alert('Organigrama guardado correctamente. Todos los cambios ya están sincronizados con la base de datos.');
}

// Manejar el modo de conexión entre nodos
function handleConnectionMode(nodeModel) {
    if (!sourceNode) {
        // Primer nodo seleccionado (origen)
        sourceNode = nodeModel;
        sourceNode.attr('body/stroke', '#28a745');
        sourceNode.attr('body/strokeWidth', 3);
    } else if (sourceNode.id !== nodeModel.id) {
        // Segundo nodo seleccionado (destino)
        const sourceId = sourceNode.get('nodeData').id;
        const targetId = nodeModel.get('nodeData').id;
        
        // Crear la conexión
        const newConnection = {
            sourceId: sourceId,
            targetId: targetId,
            connectionType: 'direct'  // Por defecto, línea continua
        };
        
        $.ajax({
            url: '/api/connections',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(newConnection),
            success: function(createdConnection) {
                createConnectionShape(createdConnection);
                
                // Salir del modo de conexión
                toggleConnectionMode();
                alert('Conexión creada correctamente.');
            },
            error: function(error) {
                console.error('Error al crear conexión:', error);
                alert('Error al crear la conexión.');
                toggleConnectionMode();
            }
        });
    }
}

// Activar/desactivar el modo de conexión manual
function toggleConnectionMode() {
    connectMode = !connectMode;
    
    if (connectMode) {
        $('#btn-connect-nodes').addClass('active').text('Cancelar conexión');
        $('body').css('cursor', 'crosshair');
    } else {
        $('#btn-connect-nodes').removeClass('active').text('Conectar nodos');
        $('body').css('cursor', 'default');
        
        // Limpiar nodo de origen si existe
        if (sourceNode) {
            sourceNode.attr('body/stroke', '#2c3e50');
            sourceNode.attr('body/strokeWidth', 2);
            sourceNode = null;
        }
    }
}