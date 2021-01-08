import React, { Component, useState } from 'react';
import ReactDOM from "react-dom"
import { HotTable } from '@handsontable/react';
import 'handsontable/dist/handsontable.full.css';
import '../App.css';
import {
  Collapse,
  Navbar,
  NavbarToggler,
  NavbarBrand,
  Container,
  Row,
  Col,
  Jumbotron,
  Nav,
  NavItem,
  NavLink,
  Button,
  Table, Modal, ModalHeader, ModalFooter, ModalBody, Form, FormGroup, Label, Input, ListGroup, Card, CardTitle, CardText, TabContent, TabPane, ButtonDropdown, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, UncontrolledTooltip
} from 'reactstrap';
import {
  BrowserRouter as Router,
  Route,
  Link,
  useHistory,
  Redirect
} from "react-router-dom";
import classnames from 'classnames';
import io from "socket.io-client";


const Utils = require('../utils');
let utils = new Utils();

let attendance_display = [];
let greadebook_display = [];
let student_status_display = [];
let students_display = [];
let team_grades_display = [];
let team_comments_display = [];

let in_transaction = false;

// A JSON object that keeps track of previous layout changes
let layout_changes = {
  incoming: false,
  layout_changed: false,
  changes: [], // 1st element: action;  2nd element: index
  start_idx: 0, 
  socketID: ""
}

let col_headers = []
let attendance_col_headers = [];
let grade_book_col_headers = [];
let student_status_col_headers = [];
let student_col_headers = [];
let team_grades_col_headers = [];
let team_comments_col_headers = [];
let table_loaded = false;

let user_actions = []

let SCROLL_SIZE = 5;

let display_dataset_button = ""

let data = [],  buffer = [], buffer_copy = []
let load_error = [[0]];
let name_entered = false;
let ATT_NUM = 7
let prev_scrolltop = 0
let data_display = []
let chn_copy = []
let change_detected = false;

let current_fetch_index = 1 //initial pre-prefetch index
let num_attr = 0;

let current_i = -1;
let current_j = -1;
let currently_editing = false;

let select_i = -1; 
let select_j = -1;

let allow_create_row = false;

let transaction_button = "";
let pending_changes = {
  data:[], // 2d array to store difference: y, value, x, 
  try_message: "SENT MESSAGE! SUCCESS!", 
  socketID: "",
  user: "", 
  incoming: false
}

let socket_id = "";

class Academic extends Component {

  constructor() {
    super();
    this.id = "hot";
    this.hotTableComponent = React.createRef();
    this.hotTableComponent1 = React.createRef();
    this.hotTableComponent2 = React.createRef();
    this.hotTableComponent3 = React.createRef();
    this.hotTableComponent4 = React.createRef();
    this.state = {
      collapsed: false,
      items: Array.from({ length: 0 }),
      hasMore: false,
      load_from_buffer_to_matrix: false, 

      //retrieval display variables
      hasMoreResult: false,
      resultItems: Array.from({ length: 0 }), 
      load_result_from_buffer_to_matrix: false, 

      import_page_link: '/result', 

      data_original: [], 
      check_cell_update: false, 

      test_block: "ORIGINAL MESSAGE", 
      users:[], 
      user_text_block: "", 

      isSelectPromptOpen: true, 
      user_name: "", 

      edit_message: "Last Edit: No modification yet", 
      history: [], 
      isShowHistoryOpen: false, 

      transaction_mode: false, 
      isSharedLockRejectOpen: false,
      isExclusiveLockRejectOpen: false, 

      isInstructionOpen: true,
      activeTab: '1', 

      redirect_link: "", 
      isRedirectConfirmOpen: false, 
      redirect: false, 

      isNameModalOpen: false, 
      name: "", 
      curr_table: "attendance", 

      isRestartModalOpen: false, 
      user_actions: [], 

      isCompleteConfirmationModalOpen: false, 

      refresh: false, 
      isLoadErrorModelOpen: false
    }

    this.socket = io('https://spreadsheetactions.herokuapp.com/');
    // this.socket = io('localhost:3001');

    this.socket.on('RECEIVE_ID', function(id){
      layout_changes.socketID = id;
      pending_changes.socketID = id;
      change_id(id);
    });

    // update current list of online users when a new user joins
    this.socket.on('ADD_NEW_USER', function(data) {
      console.log("adding new user");
      addNewUser(data);
    });

    // update current list of online users when one user is disconnected
    this.socket.on('CHANGE_CURRENT_USER', function(data) {
      change_current_user(data);
    });

    // update the last edit message, as well as the entire edit history
    this.socket.on('UPDATE_EDIT_MESSAGE', function(message_package) {
      update_edit_message(message_package);
    });
    

    const change_id = id => {
      socket_id = id;
    }

    const addNewUser = data => {
      this.setState({
        history: data.history
      })
      change_current_user(data);
    }

    const change_current_user = data => {
      if (data.simulation === "academic") {
      
        this.setState({
          users: data.current_users
        });
        let new_user_text = "Currently Online: ";
        for (var i = 0; i < this.state.users.length; i++) {
          if (i == this.state.users.length - 1) {
            new_user_text += this.state.users[i]
          } else {
            new_user_text += this.state.users[i] + ", "
          }
        }
        this.setState({
          user_text_block: new_user_text
        });
      }
    }

    const update_edit_message = message_package => {
      this.setState({
        edit_message: message_package.new_message, 
        history: message_package.history
      })
    }

    this.toggleSelectionPrompt = this.toggleSelectionPrompt.bind()
    this.toggleNavbar = this.toggleNavbar.bind()
    this.toggleInstructionModal = this.toggleInstructionModal.bind();
    this.toggleNameModal = this.toggleNameModal.bind();
    this.toggleRestartModal = this.toggleRestartModal.bind();
    this.toggleCompleteConfirmModal = this.toggleCompleteConfirmModal.bind();
    this.toggleShowHistory = this.toggleShowHistory.bind();
    this.toggleLoadErrorModal = this.toggleLoadErrorModal.bind();
  }

  // fetch 50 rows of data into the buffer
  async componentDidMount() {

    // receive updates on spreadsheet from other users
    this.socket.on('RECEIVE_MESSAGE', function(data){
      addMessage(data);
    });

    const addMessage = data => {
      // ignore if these actions come from this user itself
      if (data.socketID === socket_id) {
        return;
      }

      console.log("the changes to other users are: ", data)
      let change_table = data.data
      for (var x = 0; x < change_table.length; x++) {

        // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord] for cell changes
        // [table_name, change_type, operation, direction, search_attribute, socket_id] for remove row
        // [table_name, change_type, operation, value, search_attribute, socket_id] for insert row
        if (change_table[x][1] === "layout_change") {
          if (change_table[x][5] === socket_id) {
            continue;
          } else {
            process_layout_changes(change_table[x]);
            continue;
          }
        }

        // Extract data
        let table = change_table[x][0]; // table corresponds to this change  
        let value = change_table[x][2] // 1 --> actual value

        // reflect each update to its corresponding table
        try { 
          // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord] for cell changes
          // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord, prev_value] for special remove
          let x_coord = change_table[x][7];

          if (table === "attendance") {
            console.log("attendance change table: ", change_table[x]);
            for (var i = 0; i < attendance_display.length; i++) {
              if (attendance_display[i][1] === change_table[x][5] && change_table[x][5] !== "") {
                attendance_display[i][x_coord] = value;
              }
            }
            
          } else if (table === "cs225_gradebook") {
            console.log("gradebook change table: ", change_table[x]);
            for (var i = 0; i < greadebook_display.length; i++) {
              if (greadebook_display[i][1] === change_table[x][5] && change_table[x][5] !== "") {
                greadebook_display[i][x_coord] = value;
              }
            }
            
          } else if (table === "students") {
            if (change_table[x][1] === "special_remove") {
              for (var i = 0; i < students_display.length; i++) {
                if (students_display[i][0] === change_table[x][8] || students_display[i][1] === change_table[x][8] || students_display[i][2] === change_table[x][8]) {
                  students_display[i][x_coord] = value;
                }
              }
            } else {
              for (var i = 0; i < students_display.length; i++) {
                if ((students_display[i][0] === change_table[x][4] && change_table[x][4] !== "") || (students_display[i][1] === change_table[x][5] && change_table[x][5] !== "") || (students_display[i][2] === change_table[x][8] && change_table[x][8] !== "")) {
                  students_display[i][x_coord] = value;
                }
              }
            }
          } else if (table === "team_grades") {
            console.log("team grade change table: ", change_table[x]);
            for (var i = 0; i < team_grades_display.length; i++) {
              if (team_grades_display[i][0] === change_table[x][4] && change_table[x][4] !== "") {
                team_grades_display[i][x_coord] = value;
              }
            }
            
          } else if (table === "team_comments") {
            console.log("team comments change table: ", change_table[x]);
            for (var i = 0; i < team_comments_display.length; i++) {
              if (team_comments_display[i][0] === change_table[x][4] && change_table[x][4] !== "") {
                team_comments_display[i][x_coord] = value;
              }
            }
            
          }
        } catch (error) {
          console.log(error);
        }
      }
    };

    const process_layout_changes = curr_changes => {
      console.log("the new layout change is: ", curr_changes);
      // [table_name, change_type, operation, direction, search_attribute, socket_id] for remove row
      // [table_name, change_type, operation, value, search_attribute, socket_id, y_coord] for insert row

      // get the current table for current change to process
      let table_instance = "";
      let table = "";
      let headers = "";
      if (curr_changes[0] === "attendance") {
        table_instance = this.hotTableComponent.current.hotInstance;
        table = attendance_display;
        headers = attendance_col_headers;
      } else if (curr_changes[0] === "cs225_gradebook") {
        table_instance = this.hotTableComponent1.current.hotInstance;
        table = greadebook_display;
        headers = grade_book_col_headers;
      } else if (curr_changes[0] === "students") {
        table_instance = this.hotTableComponent2.current.hotInstance;
        table = students_display;
        headers = student_col_headers;
      } else if (curr_changes[0] === "team_grades") {
        table_instance = this.hotTableComponent3.current.hotInstance;
        table = team_grades_display;
        headers = team_grades_col_headers;
      } else if (curr_changes[0] === "team_comments") {
        table_instance = this.hotTableComponent4.current.hotInstance;
        table = team_comments_display;
        headers = team_comments_col_headers;
      }

      if (curr_changes[2] === "remove_r") {
        // search for the row to delete
        for (var index = 0; index < table.length; index++) {
          if (table[index][0] === curr_changes[4]) {
            pending_changes.incoming = true;
            layout_changes.incoming = true;
            in_transaction = true;
            table_instance.alter('remove_row', index, 1);
            in_transaction = false;
            break;
          }
        }

      } else if (curr_changes[2] === "insert_r") {

        // find the first empty row
        for (var i = 0; i < table.length; i++) {

          // test if current row is empty
          let empty = true;
          for (var j = 0; j < table[i].length; j++) {
            if (table[i][j] !== "") {
              empty = false;
              break;
            }
          }

          // find the first empty row
          if (empty) {
            // check if there's an uncommitted insert. If so, push it down
            let insert_uncommitted = false;
            let num_insert_uncommitted = 0;
            if (in_transaction) {
              for (var k = 0; k < pending_changes.data.length; k++) {
                if (pending_changes.data[k][2] === "insert_r") {
                  insert_uncommitted = true;
                  num_insert_uncommitted++;
                }
              }
            }

            // found uncommitted insert, insert a row in the middle
            if (insert_uncommitted) {
              i = i - num_insert_uncommitted;
              allow_create_row = true;
              table_instance.alter('insert_row', i, 1);
              if (change_detected && chn_copy[0][0] === i) {
                change_detected = false;
              }
              allow_create_row = false;
            }

            // Do insertion
            for (var j = 0; j < headers.length; j++) {
              if (headers[j] === curr_changes[4]) {
                table[i][j] = curr_changes[3];
              }
            }
            break;
          }

        }
      }
    }

    // REMOVED FOR THE FIRST USER STUDY -------------------------------------------------------------------------------------------

    // Removed for the first user study
    // this.socket.on('RECEIVE_FREED_CELLS', function(free_cells_package) {
    //   update_freed_cells(free_cells_package);
    // });

    // function that updates all the cells that do not have any lock anymore. 
    // const update_freed_cells = free_cells_package => {
    //   console.log("received freecell called with: ", free_cells_package);

    //   let free_cells = free_cells_package.free_cells;
    //   let disconnect = free_cells_package.disconnect;

    //   for (var i = 0; i < free_cells.length; i++) {
    //     let location = free_cells[i];
    //     if (location[0] === "attendance") {
    //       console.log("enter here with location: ", location);
    //       let cell_data = this.hotTableComponent.current.hotInstance.getDataAtCell(location[1], location[2]);

    //       // update read-only cells
    //       if (cell_data[0] == "*") {
    //         let new_data = cell_data.substring(1);
    //         this.hotTableComponent.current.hotInstance.setDataAtCell(location[1], location[2], new_data);

    //       } else if (cell_data == "-----" && disconnect == true) {
    //         data_display[location[0], location[1]] = this.state.data_original[location[1], location[2]];
    //       }

    //     } else if (location[0] === "cs225_gradebook") {
    //       let cell_data = this.hotTableComponent1.current.hotInstance.getDataAtCell(location[1], location[2]);

    //       // update read-only cells
    //       if (cell_data[0] == "*") {
    //         let new_data = cell_data.substring(1);
    //         this.hotTableComponent1.current.hotInstance.setDataAtCell(location[1], location[2], new_data);

    //       } else if (cell_data == "-----" && disconnect == true) {
    //         data_display[location[0], location[1]] = this.state.data_original[location[1], location[2]];
    //       }

    //     } else if (location[0] === "students") {
    //       let cell_data = this.hotTableComponent2.current.hotInstance.getDataAtCell(location[1], location[2]);

    //       // update read-only cells
    //       if (cell_data[0] == "*") {
    //         let new_data = cell_data.substring(1);
    //         this.hotTableComponent2.current.hotInstance.setDataAtCell(location[1], location[2], new_data);

    //       } else if (cell_data == "-----" && disconnect == true) {
    //         data_display[location[0], location[1]] = this.state.data_original[location[1], location[2]];
    //       }

    //     } else if (location[0] === "team_grades") {
    //       let cell_data = this.hotTableComponent3.current.hotInstance.getDataAtCell(location[1], location[2]);

    //       // update read-only cells
    //       if (cell_data[0] == "*") {
    //         let new_data = cell_data.substring(1);
    //         this.hotTableComponent3.current.hotInstance.setDataAtCell(location[1], location[2], new_data);

    //       } else if (cell_data == "-----" && disconnect == true) {
    //         data_display[location[0], location[1]] = this.state.data_original[location[1], location[2]];
    //       }

    //     } else if (location[0] === "team_comments") {
    //       let cell_data = this.hotTableComponent4.current.hotInstance.getDataAtCell(location[1], location[2]);

    //       // update read-only cells
    //       if (cell_data[0] == "*") {
    //         let new_data = cell_data.substring(1);
    //         this.hotTableComponent4.current.hotInstance.setDataAtCell(location[1], location[2], new_data);

    //       } else if (cell_data == "-----" && disconnect == true) {
    //         data_display[location[0], location[1]] = this.state.data_original[location[1], location[2]];
    //       }

    //     }
    //   }
    //   cell_read_only();
    // }

    // Removed for the first user study
    // this.socket.on('REQUEST_SHARED_ACCEPT', function(shared_lock_accept) {
    //   let table = shared_lock_accept.table;
    //   let row = shared_lock_accept.row;
    //   let col = shared_lock_accept.col;

    //   display_shared_lock(table, row, col);

    // });

    // the function that turns a cell into read-only due to a read lock
    // const cell_read_only = () => {
      
    //     this.hotTableComponent.current.hotInstance.updateSettings({
    //         cells: function(row, col, prop){
    //         var cellProperties = {};
    //           if(attendance_display[row][col] !== null && attendance_display[row][col].length !== 0 &&  (attendance_display[row][col] == "-----" || attendance_display[row][col].charAt(0) === "*")){
    //             cellProperties.readOnly = 'true'
    //           }
    //         return cellProperties
    //       }
    //     });

      
    //     this.hotTableComponent1.current.hotInstance.updateSettings({
    //         cells: function(row, col, prop){
    //         var cellProperties = {};
    //           if(greadebook_display[row][col] !== null && greadebook_display[row][col].length !== 0 &&  (greadebook_display[row][col] == "-----" || greadebook_display[row][col].charAt(0) === "*")){
    //             cellProperties.readOnly = 'true'
    //           }
    //         return cellProperties
    //       }
    //     });

    //     this.hotTableComponent2.current.hotInstance.updateSettings({
    //         cells: function(row, col, prop){
    //         var cellProperties = {};
    //           if(students_display[row][col] !== null && students_display[row][col].length !== 0 &&  (students_display[row][col] == "-----" || students_display[row][col].charAt(0) === "*")){
    //             cellProperties.readOnly = 'true'
    //           }
    //         return cellProperties
    //       }
    //     });

      
    //     this.hotTableComponent3.current.hotInstance.updateSettings({
    //         cells: function(row, col, prop){
    //         var cellProperties = {};
    //           if(team_grades_display[row][col] !== null && team_grades_display[row][col].length !== 0 &&  (team_grades_display[row][col] == "-----" || team_grades_display[row][col].charAt(0) === "*")){
    //             cellProperties.readOnly = 'true'
    //           }
    //         return cellProperties
    //       }
    //     }); 

    //     this.hotTableComponent4.current.hotInstance.updateSettings({
    //       cells: function(row, col, prop){
    //       var cellProperties = {};
    //         if(team_comments_display[row][col] !== null && team_comments_display[row][col].length !== 0 &&  (team_comments_display[row][col] == "-----" || team_comments_display[row][col].charAt(0) === "*")){
    //           cellProperties.readOnly = 'true'
    //         }
    //       return cellProperties
    //     }
    //   }); 
    // }

    // Removed for the first user study
    // Function that accept the position of a new shared lock and display it
    // const display_shared_lock = (table, row, col) => {

    //   if (table === "attendance") {
    //     let cell_data = this.hotTableComponent.current.hotInstance.getDataAtCell(row, col);
    //     // if there is a shared lock displaying already, do nothing
    //     if (cell_data.charAt(0) === "*") {
    //       return;
    //     } else {
    //       let new_data = "*" + cell_data
    //       this.hotTableComponent.current.hotInstance.setDataAtCell(row, col, new_data);
    //     }

    //   } else if (table === "cs225_gradebook") {
    //     let cell_data = this.hotTableComponent1.current.hotInstance.getDataAtCell(row, col);
    //     // if there is a shared lock displaying already, do nothing
    //     if (cell_data.charAt(0) === "*") {
    //       return;
    //     } else {
    //       let new_data = "*" + cell_data
    //       this.hotTableComponent1.current.hotInstance.setDataAtCell(row, col, new_data);
    //     }

    //   } else if (table === "students") {
    //     let cell_data = this.hotTableComponent2.current.hotInstance.getDataAtCell(row, col);
    //     // if there is a shared lock displaying already, do nothing
    //     if (cell_data.charAt(0) === "*") {
    //       return;
    //     } else {
    //       let new_data = "*" + cell_data
    //       this.hotTableComponent2.current.hotInstance.setDataAtCell(row, col, new_data);
    //     }

    //   } else if (table === "team_grades") {
    //     let cell_data = this.hotTableComponent3.current.hotInstance.getDataAtCell(row, col);
    //     // if there is a shared lock displaying already, do nothing
    //     if (cell_data.charAt(0) === "*") {
    //       return;
    //     } else {
    //       let new_data = "*" + cell_data
    //       this.hotTableComponent3.current.hotInstance.setDataAtCell(row, col, new_data);
    //     }
    //   } else if (table === "team_comments") {
    //     let cell_data = this.hotTableComponent4.current.hotInstance.getDataAtCell(row, col);
    //     // if there is a shared lock displaying already, do nothing
    //     if (cell_data.charAt(0) === "*") {
    //       return;
    //     } else {
    //       let new_data = "*" + cell_data
    //       this.hotTableComponent4.current.hotInstance.setDataAtCell(row, col, new_data);
    //     }
    //   }
    //   cell_read_only();
    // }

    // REMOVED FOR THE FIRST USER STUDY -------------------------------------------------------------------------------------------

    transaction_button = <Button size='lg' className='display-button' color="primary" onClick={this.start_transaction} >Start Transaction</Button>


    // FIRST COMPONENT REF ========================================================================================
    this.hotTableComponent.current.hotInstance.addHook('afterChange', function(chn, src) {
      if (src === 'edit') {
        console.log(chn);

        try {
          // call check_cell_change if original and new data differ
          if (chn[0][2] !== chn[0][3] && (chn[0][3] === null || (chn[0][3].charAt(0) !== "*" && chn[0][3] !== "-----") )) {
            console.log("differ!");
            chn_copy = chn;
            if (chn_copy[0][3] === null) {
              chn_copy[0][3] = "";
            }
            change_detected = true;

            // remove currently editing state
            current_i = -1;
            current_j = -1;
            currently_editing = false;
          }
        }
        catch (err) {
          console.log(err);
        }
      }
    });

    this.hotTableComponent.current.hotInstance.addHook('afterBeginEditing', function(row, col) {

      // record the currently editing location and state. 
      current_i = row;
      current_j = col;
    });

    this.hotTableComponent.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
      currently_editing = true;
    });

    this.hotTableComponent.current.hotInstance.addHook('beforeCreateRow', function(data, coords) {
      if (allow_create_row) {
        return true;
      } else {
        return false;
      }
    });

    this.hotTableComponent.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false
      } else {
        if (source === "ContextMenu.rowBelow") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "below", index, "attendance"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "above", index, "attendance"]);
        }
      }
    });

    this.hotTableComponent.current.hotInstance.addHook('beforeCreateCol', function(data, coords) {
      return false;
    });

    this.hotTableComponent.current.hotInstance.addHook('afterCreateCol', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        if (source === "ContextMenu.columnRight") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "right", index, "attendance"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "left", index, "attendance"]);
        }
      }
    });

    this.hotTableComponent.current.hotInstance.addHook('beforeRemoveRow', function(index, amount) {

      // prevent remove row if not in a transaction
      if (!in_transaction) {
        return false;
      }

      // [table_name, change_type, operation, direction, search_attribute, socket_id] for remove row
      if (pending_changes.incoming === true) {
        pending_changes.incoming = false;
      } else {
        let temp = []
        temp[0] = "attendance";
        temp[1] = "layout_change";
        temp[2] = "remove_r";
        temp[3] = null;
        temp[4] = attendance_display[index][0];
        temp[5] = socket_id;
        pending_changes.data.push(temp);
      }
    });

    this.hotTableComponent.current.hotInstance.addHook('afterRemoveRow', function(index, amount, physicalRows, source) {
      console.log("after remove row index: ", index);
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_r", null, index, "attendance"]);
      }
    });

    this.hotTableComponent.current.hotInstance.addHook('beforeRemoveCol', function(index, amount) {
      return false;
    });

    this.hotTableComponent.current.hotInstance.addHook('afterRemoveCol', function(index, amount, physicalRows, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_c", null, index, "attendance"]);
      }
    });

    // SECOND COMPONENT REF ========================================================================================
    this.hotTableComponent1.current.hotInstance.addHook('afterChange', function(chn, src) {
      if (src === 'edit') {
        console.log(chn);
        
        try {
          // call check_cell_change if original and new data differ
          if (chn[0][2] !== chn[0][3] && (chn[0][3] === null || (chn[0][3].charAt(0) !== "*" && chn[0][3] !== "-----") )) {
            console.log("differ!");
            chn_copy = chn;
            if (chn_copy[0][3] === null) {
              chn_copy[0][3] = "";
            }
            change_detected = true;

            // remove currently editing state
            current_i = -1;
            current_j = -1;
            currently_editing = false;
          }
        }
        catch (err) {
          console.log(err)
        }
      }
    });

    this.hotTableComponent1.current.hotInstance.addHook('afterBeginEditing', function(row, col) {

      // record the currently editing location and state. 
      current_i = row;
      current_j = col;
    });

    this.hotTableComponent1.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
      currently_editing = true;
    });

    this.hotTableComponent1.current.hotInstance.addHook('beforeCreateRow', function(data, coords) {
      if (allow_create_row) {
        return true;
      } else {
        return false;
      }
    });

    this.hotTableComponent1.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        if (source === "ContextMenu.rowBelow") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "below", index, "cs225_gradebook"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "above", index, "cs225_gradebook"]);
        }
      }
    });

    this.hotTableComponent1.current.hotInstance.addHook('beforeCreateCol', function(data, coords) {
      return false;
    });

    this.hotTableComponent1.current.hotInstance.addHook('afterCreateCol', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        if (source === "ContextMenu.columnRight") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "right", index, "cs225_gradebook"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "left", index, "cs225_gradebook"]);
        }
      }
    });

    this.hotTableComponent1.current.hotInstance.addHook('beforeRemoveRow', function(index, amount) {
      // prevent remove row if not in a transaction
      if (!in_transaction) {
        return false;
      }

      // [table_name, change_type, operation, direction, search_attribute, socket_id] for remove row
      if (pending_changes.incoming === true) {
        pending_changes.incoming = false;
      } else {
        let temp = []
        temp[0] = "cs225_gradebook";
        temp[1] = "layout_change";
        temp[2] = "remove_r";
        temp[3] = null;
        temp[4] = greadebook_display[index][0];
        temp[5] = socket_id;
        pending_changes.data.push(temp);
      }
    });

    this.hotTableComponent1.current.hotInstance.addHook('afterRemoveRow', function(index, amount, physicalRows, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_r", null, index, "cs225_gradebook"]);
      }
    });

    this.hotTableComponent1.current.hotInstance.addHook('beforeRemoveCol', function(index, amount) {
      return false;
    });

    this.hotTableComponent1.current.hotInstance.addHook('afterRemoveCol', function(index, amount, physicalRows, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_c", null, index, "cs225_gradebook"]);
      }
    });

    // THIRD COMPONENT REF ========================================================================================
    this.hotTableComponent2.current.hotInstance.addHook('afterChange', function(chn, src) {
      if (src === 'edit') {
        console.log(chn);

        try {
          // call check_cell_change if original and new data differ
          if (chn[0][2] !== chn[0][3] && (chn[0][3] === null || (chn[0][3].charAt(0) !== "*" && chn[0][3] !== "-----") )) {
            console.log("differ!");
            chn_copy = chn;
            if (chn_copy[0][3] === null) {
              chn_copy[0][3] = "";
            }
            change_detected = true;

            // remove currently editing state
            current_i = -1;
            current_j = -1;
            currently_editing = false;
          }
        }
        catch (err) {
          console.log(err);
        }
      }
    });

    this.hotTableComponent2.current.hotInstance.addHook('afterBeginEditing', function(row, col) {

      // record the currently editing location and state. 
      current_i = row;
      current_j = col;
    });

    this.hotTableComponent2.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
      currently_editing = true;
    });

    this.hotTableComponent2.current.hotInstance.addHook('beforeCreateRow', function(data, coords) {
      if (allow_create_row) {
        return true;
      } else {
        return false;
      }
    });

    this.hotTableComponent2.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        if (source === "ContextMenu.rowBelow") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "below", index, "students"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "above", index, "students"]);
        }
      }
    });

    this.hotTableComponent2.current.hotInstance.addHook('beforeCreateCol', function(data, coords) {
      return false;
    });

    this.hotTableComponent2.current.hotInstance.addHook('afterCreateCol', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        if (source === "ContextMenu.columnRight") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "right", index, "students"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "left", index, "students"]);
        }
      }
    });

    this.hotTableComponent2.current.hotInstance.addHook('beforeRemoveRow', function(index, amount) {

      // prevent remove row if not in a transaction
      if (!in_transaction) {
        return false;
      }

      // [table_name, change_type, operation, direction, search_attribute, socket_id] for remove row
      if (pending_changes.incoming === true) {
        pending_changes.incoming = false;
      } else {
        let temp = []
        temp[0] = "students";
        temp[1] = "layout_change";
        temp[2] = "remove_r";
        temp[3] = null;
        temp[4] = students_display[index][0];
        temp[5] = socket_id;
        pending_changes.data.push(temp);
      }
    });

    this.hotTableComponent2.current.hotInstance.addHook('afterRemoveRow', function(index, amount, physicalRows, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_r", null, index, "students"]);
      }
    });

    this.hotTableComponent2.current.hotInstance.addHook('beforeRemoveCol', function(index, amount) {
      return false;
    });

    this.hotTableComponent2.current.hotInstance.addHook('afterRemoveCol', function(index, amount, physicalRows, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_c", null, index, "students"]);
      }
    });

    // FOURTH COMPONENT REF ========================================================================================
    this.hotTableComponent3.current.hotInstance.addHook('afterChange', function(chn, src) {
      if (src === 'edit') {
        console.log(chn);
        
        try {
          // call check_cell_change if original and new data differ
          if (chn[0][2] !== chn[0][3] && (chn[0][3] === null || (chn[0][3].charAt(0) !== "*" && chn[0][3] !== "-----") )) {
            console.log("differ!");
            chn_copy = chn;
            if (chn_copy[0][3] === null) {
              chn_copy[0][3] = "";
            }
            change_detected = true;

            // remove currently editing state
            current_i = -1;
            current_j = -1;
            currently_editing = false;
          }
        }
        catch (err) {
          console.log(err);
        }
      }
    });

    this.hotTableComponent3.current.hotInstance.addHook('afterBeginEditing', function(row, col) {

      // record the currently editing location and state. 
      current_i = row;
      current_j = col;
    });

    this.hotTableComponent3.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
      currently_editing = true;
    });

    this.hotTableComponent3.current.hotInstance.addHook('beforeCreateRow', function(data, coords) {
      if (allow_create_row) {
        return true;
      } else {
        return false;
      }
    });

    this.hotTableComponent3.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        if (source === "ContextMenu.rowBelow") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "below", index, "team_grades"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "above", index, "team_grades"]);
        }
      }
    });

    this.hotTableComponent3.current.hotInstance.addHook('beforeCreateCol', function(data, coords) {
      return false;
    });

    this.hotTableComponent3.current.hotInstance.addHook('afterCreateCol', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        if (source === "ContextMenu.columnRight") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "right", index, "team_grades"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "left", index, "team_grades"]);
        }
      }
    });

    this.hotTableComponent3.current.hotInstance.addHook('beforeRemoveRow', function(index, amount) {

      // prevent remove row if not in a transaction
      if (!in_transaction) {
        return false;
      }

      // [table_name, change_type, operation, direction, search_attribute, socket_id] for remove row
      if (pending_changes.incoming === true) {
        pending_changes.incoming = false;
      } else {
        let temp = []
        temp[0] = "team_grades";
        temp[1] = "layout_change";
        temp[2] = "remove_r";
        temp[3] = null;
        temp[4] = team_grades_display[index][0];
        temp[5] = socket_id;
        pending_changes.data.push(temp);
      }
    });

    this.hotTableComponent3.current.hotInstance.addHook('afterRemoveRow', function(index, amount, physicalRows, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_r", null, index, "team_grades"]);
      }
    });

    this.hotTableComponent3.current.hotInstance.addHook('beforeRemoveCol', function(index, amount) {
      return false;
    });


    this.hotTableComponent3.current.hotInstance.addHook('afterRemoveCol', function(index, amount, physicalRows, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_c", null, index, "team_grades"]);
      }
    });

    // FIFTH COMPONENT REF ========================================================================================
    this.hotTableComponent4.current.hotInstance.addHook('afterChange', function(chn, src) {
      if (src === 'edit') {
        console.log(chn);
        
        try {
          // call check_cell_change if original and new data differ
          if (chn[0][2] !== chn[0][3] && (chn[0][3] === null || (chn[0][3].charAt(0) !== "*" && chn[0][3] !== "-----") )) {
            console.log("differ!");
            chn_copy = chn;
            if (chn_copy[0][3] === null) {
              chn_copy[0][3] = "";
            }
            change_detected = true;

            // remove currently editing state
            current_i = -1;
            current_j = -1;
            currently_editing = false;
          }
        }
        catch (err) {
          console.log(err);
        }
      }
    });

    this.hotTableComponent4.current.hotInstance.addHook('afterBeginEditing', function(row, col) {

      // record the currently editing location and state. 
      current_i = row;
      current_j = col;
    });

    this.hotTableComponent4.current.hotInstance.addHook('afterSelection', function(row, column, row2, column2, preventScrolling, selectionLayerLevel) {

      // record the currently editing location and state. 
      select_i = row;
      select_j = column;
      currently_editing = true;
    });

    this.hotTableComponent4.current.hotInstance.addHook('beforeCreateRow', function(data, coords) {
      if (allow_create_row) {
        return true;
      } else {
        return false;
      }
    });

    this.hotTableComponent4.current.hotInstance.addHook('afterCreateRow', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        if (source === "ContextMenu.rowBelow") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "below", index, "team_comments"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_r", "above", index, "team_comments"]);
        }
      }
    });

    this.hotTableComponent4.current.hotInstance.addHook('beforeCreateCol', function(data, coords) {
      return false;
    });

    this.hotTableComponent4.current.hotInstance.addHook('afterCreateCol', function(index, amount, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        if (source === "ContextMenu.columnRight") {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "right", index, "team_comments"]);
        } else {
          layout_changes.layout_changed = true;
          layout_changes.changes.push(["insert_c", "left", index, "team_comments"]);
        }
      }
    });

    this.hotTableComponent4.current.hotInstance.addHook('beforeRemoveRow', function(index, amount) {

      // prevent remove row if not in a transaction
      if (!in_transaction) {
        return false;
      }
      
      // [table_name, change_type, operation, direction, search_attribute, socket_id] for remove row
      if (pending_changes.incoming === true) {
        pending_changes.incoming = false;
      } else {
        let temp = []
        temp[0] = "team_comments";
        temp[1] = "layout_change";
        temp[2] = "remove_r";
        temp[3] = null;
        temp[4] = team_comments_display[index][0];
        temp[5] = socket_id;
        pending_changes.data.push(temp);
      }
    });

    this.hotTableComponent4.current.hotInstance.addHook('afterRemoveRow', function(index, amount, physicalRows, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_r", null, index, "team_comments"]);
      }
    });

    this.hotTableComponent4.current.hotInstance.addHook('beforeRemoveCol', function(index, amount) {
      return false;
    });


    this.hotTableComponent4.current.hotInstance.addHook('afterRemoveCol', function(index, amount, physicalRows, source) {
      if (layout_changes.incoming === true) {
        layout_changes.incoming = false;
      } else {
        layout_changes.layout_changed = true;
        layout_changes.changes.push(["remove_c", null, index, "team_comments"]);
      }
    });
  }

  componentWillUnmount() {
    this.socket.disconnect();
  }

  toggleLoadErrorModal = () => {
    this.setState({
      isLoadErrorModelOpen: !this.state.isLoadErrorModelOpen
    })
  }

  toggleShowHistory = () => {
    this.setState({
      isShowHistoryOpen: !this.state.isShowHistoryOpen
    })
  }

  toggleCompleteConfirmModal = () => {
    this.setState({
      isCompleteConfirmationModalOpen: !this.state.isCompleteConfirmationModalOpen
    })
  }

  toggleRestartModal = () => {
    this.setState({
      isRestartModalOpen: !this.state.isRestartModalOpen
    })
  }

  toggleNameModal = () => {
    this.setState({
      isNameModalOpen: !this.state.isNameModalOpen
    })
  }

  toggleNavbar = () => {
    this.setState({
      collapsed: !this.state.collapsed
    })
  }

  toggleSelectionPrompt = () => {
    this.setState({
        isSelectPromptOpen: !this.state.isSelectPromptOpen
    })
  }

  toggleInstructionModal = () => {
      this.setState({
          isInstructionOpen: !this.state.isInstructionOpen
      })
  }

  handleScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight;
    if (bottom) {
      // this.display()
    }
    prev_scrolltop = e.target.scrollTop;
  }

  check_cell_change = () => {
    if (change_detected) {

      // get current chicago time
      const date = new Date();
      let curr_time = date.toLocaleString('en-US', { timeZone: 'America/Chicago' });

      // extract features of the new value  [row, col, prev, new]
      let feature = "";
      let prev_value = chn_copy[0][2];
      if (isNaN(chn_copy[0][3])) {
        feature = "STR";
      } else if (chn_copy[0][3].length === 0) {
        feature = "EMPTY";
      } else {
        feature = "DIGIT";
      }

      // record user action
      user_actions.push([this.state.name, "edit_cell", chn_copy[0][0], chn_copy[0][1], feature, this.state.curr_table, chn_copy[0][0] + 1, col_headers[chn_copy[0][1]], curr_time]);
      
      pending_changes.user = this.state.user_name
  
      let temp = []; 
      let y_coord = parseInt(chn_copy[0][0]);
      let x_coord = parseInt(chn_copy[0][1]);
      let actual_value = chn_copy[0][3];
      temp[0] = this.state.curr_table;
      temp[1] = "cell_change";
      temp[2] = actual_value;
      
      // find the correct attribute
      if (this.state.curr_table === "attendance") {

        // check if current cell change remove the last cell in row
        let last_cell = true
        for (var j = 0; j < attendance_display[y_coord].length; j++) {

          // find a non-empty cell, so not last_cell
          if (attendance_display[y_coord][j] !== "") {
            last_cell = false;
            break;
          }
        }

        // if previous is empty already, not last_cell
        if (prev_value === "") {
          last_cell = false;
        }

        // check for insertion 
        let insertion = true;
        for (var j = 0; j < attendance_display[y_coord].length; j++) {
          if (j === x_coord) {
            if (prev_value === "") {
              continue;
            } else {
              insertion = false;
              break;
            }
          }
          if (attendance_display[y_coord][j] !== "") {
            insertion = false;
            break;
          }
        }

        if (insertion) {  // [table_name, change_type, operation, value, search_attribute, socket_id, y_coord] for insert row
          temp[1] = "layout_change";
          temp[2] = "insert_r";
          temp[3] = actual_value;
          temp[4] = attendance_col_headers[x_coord];
          temp[5] = socket_id;
          temp[6] = y_coord;
        } else {
          // [table_name, change_type, update_value, update_attribute, search_attribute1=null, search_attribute2, y_coord, x_coord] for cell changes
          temp[3] = attendance_col_headers[x_coord];

          temp[4] = null;

          if (x_coord === 0) {
            temp[5] = prev_value;
          } else {
            temp[5] = attendance_display[y_coord][0];
          }
          temp[6] = y_coord;
          temp[7] = x_coord;
        }

        // previous cell is not empty, and after change the entire row is empty --> last cell. Treat as a special remove
        if (last_cell) {
          // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord, prev_value] for special remove
          temp[1] = "special_remove";
          temp[8] = prev_value;
        }

      } else if (this.state.curr_table === "cs225_gradebook") {
        // check if current cell change remove the last cell in row
        let last_cell = true
        for (var j = 0; j < greadebook_display[y_coord].length; j++) {

          // find a non-empty cell, so not last_cell
          if (greadebook_display[y_coord][j] !== "") {
            last_cell = false;
            break;
          }
        }

        // if previous is empty already, not last_cell
        if (prev_value === "") {
          last_cell = false;
        }

        // check for insertion 
        let insertion = true;
        for (var j = 0; j < greadebook_display[y_coord].length; j++) {
          if (j === x_coord) {
            if (prev_value === "") {
              continue;
            } else {
              insertion = false;
              break;
            }
          }
          if (greadebook_display[y_coord][j] !== "") {
            insertion = false;
            break;
          }
        }

        if (insertion) {  // [table_name, change_type, operation, value, search_attribute, socket_id, y_coord] for insert row
          temp[1] = "layout_change";
          temp[2] = "insert_r";
          temp[3] = actual_value;
          temp[4] = grade_book_col_headers[x_coord];
          temp[5] = socket_id;
          temp[6] = y_coord;
        } else {
          // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord] for cell changes
          temp[3] = grade_book_col_headers[x_coord];

          temp[4] = null;
          
          if (x_coord === 0) {
            temp[5] = prev_value;
          } else {
            temp[5] = greadebook_display[y_coord][0];
          }
          
          temp[6] = y_coord;
          temp[7] = x_coord;
        }

        // previous cell is not empty, and after change the entire row is empty --> last cell. Treat as a special remove
        if (last_cell) {
          // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord, prev_value] for special remove
          temp[1] = "special_remove";
          temp[8] = prev_value;
        }

      } else if (this.state.curr_table === "students") {
        // check if current cell change remove the last cell in row
        let last_cell = true
        for (var j = 0; j < students_display[y_coord].length; j++) {

          // find a non-empty cell, so not last_cell
          if (students_display[y_coord][j] !== "") {
            last_cell = false;
            break;
          }
        }

        // if previous is empty already, not last_cell
        if (prev_value === "") {
          last_cell = false;
        }

        // check for insertion 
        let insertion = true;
        for (var j = 0; j < students_display[y_coord].length; j++) {
          if (j === x_coord) {
            if (prev_value === "") {
              continue;
            } else {
              insertion = false;
              break;
            }
          }
          if (students_display[y_coord][j] !== "") {
            insertion = false;
            break;
          }
        }

        if (insertion) {  // [table_name, change_type, operation, value, search_attribute, socket_id, y_coord] for insert row
          temp[1] = "layout_change";
          temp[2] = "insert_r";
          temp[3] = actual_value;
          temp[4] = student_col_headers[x_coord];
          temp[5] = socket_id;
          temp[6] = y_coord;
        } else {
          // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord, search_attribute3] for cell changes
          temp[3] = student_col_headers[x_coord];
          if (x_coord === 0) {
            temp[4] = prev_value;
          } else {
            temp[4] = students_display[y_coord][0];
          }
          
          if (x_coord === 1) {
            temp[5] = prev_value;
          } else {
            temp[5] = students_display[y_coord][1];
          }
          
          temp[6] = y_coord;
          temp[7] = x_coord;
          if (x_coord === 2) {
            temp[8] = prev_value;
          } else {
            temp[8] = students_display[y_coord][2];
          }
        }

        // previous cell is not empty, and after change the entire row is empty --> last cell. Treat as a special remove
        if (last_cell) {
          // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord, prev_value] for special remove
          temp[1] = "special_remove";
          temp[8] = prev_value;
        }

      } else if (this.state.curr_table === "team_grades") {
        // check if current cell change remove the last cell in row
        let last_cell = true
        for (var j = 0; j < team_grades_display[y_coord].length; j++) {

          // find a non-empty cell, so not last_cell
          if (team_grades_display[y_coord][j] !== "") {
            last_cell = false;
            break;
          }
        }

        // if previous is empty already, not last_cell
        if (prev_value === "") {
          last_cell = false;
        }

        // check for insertion 
        let insertion = true;
        for (var j = 0; j < team_grades_display[y_coord].length; j++) {
          if (j === x_coord) {
            if (prev_value === "") {
              continue;
            } else {
              insertion = false;
              break;
            }
          }
          if (team_grades_display[y_coord][j] !== "") {
            insertion = false;
            break;
          }
        }

        if (insertion) {  // [table_name, change_type, operation, value, search_attribute, socket_id, y_coord] for insert row
          temp[1] = "layout_change";
          temp[2] = "insert_r";
          temp[3] = actual_value;
          temp[4] = team_grades_col_headers[x_coord];
          temp[5] = socket_id;
          temp[6] = y_coord;
        } else {
          // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord] for cell changes
          temp[3] = team_grades_col_headers[x_coord];
          if (x_coord === 0) {
            temp[4] = prev_value;
          } else {
            temp[4] = team_grades_display[y_coord][0];
          }
          temp[5] = null;
          temp[6] = y_coord;
          temp[7] = x_coord;
        }

        // previous cell is not empty, and after change the entire row is empty --> last cell. Treat as a special remove
        if (last_cell) {
          // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord, prev_value] for special remove
          temp[1] = "special_remove";
          temp[8] = prev_value;
        }

      } else if (this.state.curr_table === "team_comments") {
        // check if current cell change remove the last cell in row
        let last_cell = true
        for (var j = 0; j < team_comments_display[y_coord].length; j++) {

          // find a non-empty cell, so not last_cell
          if (team_comments_display[y_coord][j] !== "") {
            last_cell = false;
            break;
          }
        }

        // if previous is empty already, not last_cell
        if (prev_value === "") {
          last_cell = false;
        }

        // check for insertion 
        let insertion = true;
        let search_key_idx = 0;
        for (var j = 0; j < team_comments_display[y_coord].length; j++) {
          if (j === x_coord) {
            if (prev_value === "") {
              continue;
            } else {
              insertion = false;
              break;
            }
          }
          if (team_comments_display[y_coord][j] !== "") {
            insertion = false;
            search_key_idx = j;
            break;
          }
        }

        if (insertion) {  // [table_name, change_type, operation, value, search_attribute, socket_id, y_coord] for insert row
          temp[1] = "layout_change";
          temp[2] = "insert_r";
          temp[3] = actual_value;
          temp[4] = team_comments_col_headers[x_coord];
          temp[5] = socket_id;
          temp[6] = y_coord;
        } else {
          // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord] for cell changes
          temp[3] = team_comments_col_headers[x_coord];
          if (x_coord === 0) {
            temp[4] = prev_value;
          } else {
            temp[4] = team_comments_display[y_coord][0];
          }
          temp[5] = null;
          temp[6] = y_coord;
          temp[7] = x_coord;
        }

        // previous cell is not empty, and after change the entire row is empty --> last cell. Treat as a special remove
        if (last_cell) {
          // [table_name, change_type, update_value, update_attribute, search_attribute1, search_attribute2, y_coord, x_coord, prev_value] for special remove
          temp[1] = "special_remove";
          temp[8] = prev_value;
        }

      }

      pending_changes.data.push(temp);
      change_detected = false;
    } else {
      console.log("no changed detected")
    }
  }

  start_transaction = () => {
    // get current chicago time
    const date = new Date();
    let curr_time = date.toLocaleString('en-US', { timeZone: 'America/Chicago' });

    pending_changes.data = []
    this.setState({
      transaction_mode: true
    });
    in_transaction = true;
    transaction_button = <Button size='lg' className='display-button' color="primary" onClick={this.end_transaction} >End Transaction</Button> 
    setTimeout(() => {
      user_actions.push([this.state.name, "START_TRANSACTION", "START_TRANSACTION", "START_TRANSACTION", "START_TRANSACTION", "START_TRANSACTION", "START_TRANSACTION", "START_TRANSACTION", curr_time]);
    }, 200);
  }

  end_transaction = () => {
    // get current chicago time
    const date = new Date();
    let curr_time = date.toLocaleString('en-US', { timeZone: 'America/Chicago' });

    this.setState({
      transaction_mode: false
    });
    in_transaction = false;
    transaction_button = <Button size='lg' className='display-button' color="primary" onClick={this.start_transaction} >Start Transaction</Button>

    // signal backend to release locks | Removed for the first user study
    // this.socket.emit('FINISH_TRANSACTION');

    // send updates to socket
    setTimeout(() => {
      // remove data noise by removing the invisible click before end transaction
      if (user_actions.length >= 3) {
        if (user_actions[user_actions.length - 1][1] === "click" && user_actions[user_actions.length - 2][1] === "edit_cell" && user_actions[user_actions.length - 3][1] === "keyPress_enter") {
          user_actions.pop();
        }
      }
      user_actions.push([this.state.name, "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", "END_TRANSACTION", curr_time]);
      this.commit_transaction();

      // send updates to the database
      const requestOptions = {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({pending_changes})
      };
      fetch('https://spreadsheetactions.herokuapp.com/academic/update', requestOptions,  {mode: 'no-cors'})
    }, 500);
  }

  commit_transaction = () => {
    // send cell changes to the socket
    if (pending_changes.data.length !== 0) {
      this.socket.emit('SEND_MESSAGE', pending_changes);
    }

    // send layout changes to the socket
    if (layout_changes.changes.length !== 0) {

      // reset layout changes
      layout_changes.changes.length = 0;
      layout_changes.start_idx = 0;
    }
  }

  track_action = (e, action_type) => {

    // get current chicago time
    const date = new Date();
    let curr_time = date.toLocaleString('en-US', { timeZone: 'America/Chicago' });

    // check and update possible spreadsheet layout change
    if (layout_changes.layout_changed) { 

      // add in all layout changes
      for (var i = layout_changes.start_idx; i < layout_changes.changes.length; i++) {
        let layout_change_type = layout_changes.changes[i][0];
        let layout_change_direction = layout_changes.changes[i][1];
        let change_index = layout_changes.changes[i][2];
        user_actions.push([this.state.name, layout_change_type, change_index, layout_change_direction, null, this.state.curr_table, null, null, curr_time]); 
        layout_changes.start_idx++;
      }

      // clear up current layout_changes recorder
      layout_changes.layout_changed = false;
    }

    // calculate click action
    else if (action_type === "click") {

      if (currently_editing) {
        
        // select a row
        if (select_j < 0) {
          user_actions.push([this.state.name, "select_r", select_i, null, null, this.state.curr_table, null, null, curr_time]);
        }

        // select a column
        else if (select_i < 0) {
          user_actions.push([this.state.name, "select_c", select_j, null, null, this.state.curr_table, null, null, curr_time]);
        }
        
        // select a cell
        else {
          user_actions.push([this.state.name, action_type, select_i, select_j, null, this.state.curr_table, select_i + 1, col_headers[select_j], curr_time]);
        }
        currently_editing = false;
      }
      this.check_cell_change();
    }

    // calculate kepress action
    else if (action_type === "key_press") {

      if (currently_editing) {
        console.log("currently editing");
         // left arrow
        if (e.keyCode === 37) {
          user_actions.push([this.state.name, "left_arrow", select_i, select_j, null, this.state.curr_table, select_i + 1, col_headers[select_j], curr_time]);
        }

        // up arrow
        else if (e.keyCode === 38) {
          user_actions.push([this.state.name, "up_arrow", select_i, select_j, null, this.state.curr_table, select_i + 1, col_headers[select_j], curr_time]);
        }

        // right arrow
        else if (e.keyCode === 39) {
          user_actions.push([this.state.name, "right_arrow", select_i, select_j, null, this.state.curr_table, select_i + 1, col_headers[select_j], curr_time]);
        }

        // down arrow
        else if (e.keyCode === 40) {
          user_actions.push([this.state.name, "down_arrow", select_i, select_j, null, this.state.curr_table, select_i + 1, col_headers[select_j], curr_time]);
        }
      }

      if (change_detected) {
        // handle enter press
        if (e.key === "Enter") {
          user_actions.push([this.state.name, "keyPress_enter", chn_copy[0][0], chn_copy[0][1], null, this.state.curr_table, chn_copy[0][0] + 1, col_headers[chn_copy[0][1]], curr_time]);
        }

        // handle tab press
        else if (e.key === "Tab") {
          user_actions.push([this.state.name, "keyPress_tab", chn_copy[0][0], chn_copy[0][1], null, this.state.curr_table, chn_copy[0][0] + 1, col_headers[chn_copy[0][1]], curr_time]);
        }

        // all other press 
        else {
          user_actions.push([this.state.name, "keyPress", chn_copy[0][0], chn_copy[0][1], null, this.state.curr_table, chn_copy[0][0] + 1, col_headers[chn_copy[0][1]], curr_time]);
        }
      }
      this.check_cell_change();
      currently_editing = false;
    }
    console.log(user_actions);
  }

  store_training_data = () => {
    // get current chicago time
    const date = new Date();
    let curr_time = date.toLocaleString('en-US', { timeZone: 'America/Chicago' });
    
    user_actions.push([this.state.name, "END_TRAINING_DATA", null, null, null, this.state.curr_table, null, null, curr_time]);
    let action_package = {
      user_actions: user_actions
    }
    //POST req here
    const requestOptions = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action_package})
    };
    fetch('https://spreadsheetactions.herokuapp.com/training/send-training-data/academic', requestOptions,  {mode: 'no-cors'})

    // bring up confirmation modal
    this.toggleCompleteConfirmModal();
  }

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
        this.setState({ activeTab: tab });
    }
    if (tab === '1') {  
      this.setState({
        curr_table: "attendance" 
      })
      col_headers = attendance_col_headers;
      
    } else if (tab === '2') {
      this.setState({
        curr_table: "cs225_gradebook"
      })
      col_headers = grade_book_col_headers;

    } else if (tab === '3') {
      this.setState({
        curr_table: "students"
      });
      col_headers = student_col_headers;

    } else if (tab === '4') {
      this.setState({
        curr_table: "team_grades"
      });
      col_headers = team_grades_col_headers;

    } else if (tab === '5') {
      this.setState({
        curr_table: "team_comments"
      });
      col_headers = team_comments_col_headers;
    }
  }

  load_tables = (e) => {
    e.preventDefault();
    if (table_loaded) {
      this.toggleInstructionModal();
    } else {
      table_loaded = true;
      utils.load_simulation_v2(1, "attendance", attendance_display, load_error, attendance_col_headers);
      utils.load_simulation_v2(1, "grade_book", greadebook_display, load_error, grade_book_col_headers);
      utils.load_simulation_v2(1, "students", students_display, load_error, student_col_headers);
      utils.load_simulation_v2(1, "team_grades", team_grades_display, load_error, team_grades_col_headers);
      utils.load_simulation_v2(1, "team_comments", team_comments_display, load_error, team_comments_col_headers);
      setTimeout(() => {
          attendance_display = [attendance_col_headers].concat(attendance_display);
          greadebook_display = [grade_book_col_headers].concat(greadebook_display);
          students_display = [student_col_headers].concat(students_display);
          team_grades_display = [team_grades_col_headers].concat(team_grades_display);
          team_comments_display = [team_comments_col_headers].concat(team_comments_display);
          this.setState({
            isInstructionOpen: false
          })
      }, 3000);
      col_headers = attendance_col_headers;
      this.setState({
        isNameModalOpen: true
      })
    }
  }

  reload_tables = () => {
    table_loaded = true;
    utils.load_simulation_v2(1, "attendance", attendance_display, load_error, attendance_col_headers);
    utils.load_simulation_v2(1, "grade_book", greadebook_display, load_error, grade_book_col_headers);
    utils.load_simulation_v2(1, "students", students_display, load_error, student_col_headers);
    utils.load_simulation_v2(1, "team_grades", team_grades_display, load_error, team_grades_col_headers);
    utils.load_simulation_v2(1, "team_comments", team_comments_display, load_error, team_comments_col_headers);
    setTimeout(() => {
        attendance_display = [attendance_col_headers].concat(attendance_display);
        greadebook_display = [grade_book_col_headers].concat(greadebook_display);
        students_display = [student_col_headers].concat(students_display);
        team_grades_display = [team_grades_col_headers].concat(team_grades_display);
        team_comments_display = [team_comments_col_headers].concat(team_comments_display);
    }, 3000);
    col_headers = attendance_col_headers;
  }

  onNameSubmit = (e) => {
    this.setState({
        [e.target.name]: e.target.value
    })
  }

  submitName = (e) => {
    e.preventDefault();
    console.log("state name is: ", this.state.name);

    let name_package = {
      user_name: this.state.name,
      simulation: "academic"
    }
    this.socket.emit('SEND_USERNAME', name_package);
    this.toggleNameModal();

    // handle load error that happens the FIRST time loading the table
    if (load_error[0][0] === 1) {
      this.setState({
        isLoadErrorModelOpen: true
      });
    }
  }

  restart = (reset_user_actions) => {

    // rollback current transaction
    if (this.state.transaction_mode) {
      this.setState({
        transaction_mode: false
      });
      in_transaction = false;
      transaction_button = <Button size='lg' className='display-button' color="primary" onClick={this.start_transaction} >Start Transaction</Button>
    }

    // reset all display
    attendance_display = [];
    greadebook_display = [];
    students_display = [];
    team_grades_display = [];
    team_comments_display = [];

    // reset all col headers
    attendance_col_headers = [];
    grade_book_col_headers = [];
    student_col_headers = [];
    team_grades_col_headers = [];
    team_comments_col_headers = [];

    // reset load error
    load_error[0][0] = 0;

    // reload all tables
    this.reload_tables();

    // clear recorded actions
    if (reset_user_actions) {
      user_actions = [];
    }

    // set tab
    this.setState({
      activeTab: '1'
    })
    this.toggle('1');

    // open restart confirmation
    this.setState({
      isRestartModalOpen: true
    })
  }

  close_restart_comfirmation = () => {
    setTimeout(() => {
      this.setState({
        isRestartModalOpen: false
      });

      // handle load error that happens during restart
      if (load_error[0][0] === 1) {
        this.setState({
          isLoadErrorModelOpen: true
        });
      }
    }, 2000);
  }

  close_confirmation = () => {
    user_actions = []
    this.toggleCompleteConfirmModal();
  }

  request_read_lock = () => {
    let shared_lock_request = {
      row: select_i,
      col: select_j, 
      table: this.state.curr_table
    }
    this.socket.emit('REQUEST_SHARED_LOCK', shared_lock_request);
  }

  record_read_cell = () => {

    // get current chicago time
    const date = new Date();
    let curr_time = date.toLocaleString('en-US', { timeZone: 'America/Chicago' });

    // get previous action
    if (user_actions.length === 0) {
      return;
    }
    let prev_action = user_actions[user_actions.length - 1];

    // find the correct table
    let table = "";
    if (this.state.curr_table === "attendance") {
      table = attendance_display;
    } else if (this.state.curr_table === "cs225_gradebook") {
      table = greadebook_display;
    }  else if (this.state.curr_table === "students") {
      table = students_display;
    } else if (this.state.curr_table === "team_grades") {
      table = team_grades_display;
    } else if (this.state.curr_table === "team_comments") {
      table = team_comments_display;
    }

    // user_actions.push([this.state.name, "select_r", select_i, null, null, this.state.curr_table, null, null, curr_time]) for select row
    // user_actions.push([this.state.name, "select_c", select_j, null, null, this.state.curr_table, null, null, curr_time]) for select column
    if (prev_action[1] === "click") {

      // extract features of the new value  [row, col, prev, new]
      let feature = "EMPTY";
      if (table[select_i][select_j] !== null && table[select_i][select_j].length !== 0 && isNaN(table[select_i][select_j])) {
        feature = "STR";
      } else if (table[select_i][select_j] !== null && table[select_i][select_j].length !== 0 && !isNaN(table[select_i][select_j])) {
        feature = "DIGIT";
      }
      user_actions.pop();
      user_actions.push([this.state.name, "READ_CELL", select_i, select_j, feature, this.state.curr_table, select_i + 1, col_headers[select_j], curr_time]);
      
    } else if (prev_action[1] === "select_r") {
      user_actions.pop();
      user_actions.push([this.state.name, "READ_ROW", prev_action[2], null, null, prev_action[5], null, null, prev_action[8]]);
    } else if (prev_action[1] === "select_c") {
      user_actions.pop();
      user_actions.push([this.state.name, "READ_COL", prev_action[2], null, null, prev_action[5], null, null, prev_action[8]]);
    } 
  }

  indicate_error = () => {
    user_actions.push([this.state.name, "ERR", "ERR", "ERR", "ERR", "ERR", "ERR", "ERR", "ERR"]);
    console.log("the pending changes are: ", pending_changes.data)
  }

  render() {
    if (this.state.redirect) {
      return <Redirect to={this.state.redirect_link} />
    }
    return (
      <div onClick={e => this.track_action(e, "click")} onKeyUp={e => this.track_action(e, "key_press")} className="App">
        <script src="node_modules/handsontable/dist/handsontable.full.min.js"></script>
        <link href="node_modules/handsontable/dist/handsontable.full.min.css" rel="stylesheet" media="screen"></link>
         <Jumbotron className='logo-jumbo'>
          </Jumbotron >
          <div>
            <Jumbotron >
                  <h1 className="display-3">Hi {this.state.name}!</h1>
                  {/* <h1 className="display-3">Hi {this.state.name}, welcome to Academic Simulation!</h1> */}
                  {/* <p className="lead">This is a simple web interface that allows you to upload spreadsheets and retrieve data.</p> */}
                  <hr className="my-2" />
                  {this.state.user_text_block}
                  <p className="lead">
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    {transaction_button}
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <Button size='lg' className='display-button' color="info" onClick={this.store_training_data} >Submit Simulation</Button>
                    {/* &nbsp;&nbsp;&nbsp;&nbsp;
                    <Button size='lg' className='display-button' color="info" onClick={e => this.restart(true)} >Reload Simulation</Button> */}
                    {/* &nbsp;&nbsp;&nbsp;&nbsp;
                    <Button size='lg' className='display-button' color="info" onClick={this.toggleInstructionModal} >Instruction</Button> */}
                    {/* &nbsp;&nbsp;&nbsp;&nbsp;
                    <Button size='lg' className='display-button' color="info" onClick={this.request_read_lock} >Read Lock</Button> */}
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <Button size='lg' className='display-button' color="info" onClick={e => this.restart(false)} >Refresh</Button>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <Button size='lg' className='display-button' color="info" onClick={this.record_read_cell} >Read</Button>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                    <Button size='lg' className='display-button' color="info" onClick={this.indicate_error} >Alert</Button>
                  </p>
                  {this.state.edit_message}

                  <Modal size='lg' isOpen={this.state.isInstructionOpen} >
                    {/* <ModalHeader ><header>Simulation Instruction</header>  </ModalHeader> */}
                    <ModalBody>
                        <h2>Welcome</h2>
                        Welcome to Academic Simulation! This instruction can be accessed at any time by clicking the "Instruction" button on this webpage. 
                        Under this simulation, there are three tables: "Attendance" table, "Gradebook" table, and a "Student Status" table. This simulation has two parts.  
                        <br/>
                        <h5>Note: </h5>
                        When you first enter this simulation, please check if all tables are loaded. If some tables only have headers loaded but no content, press the refresh button.   
                        <hr className="my-2" />
                        

                        <p className="margin-one">
                        <h2>Part 1</h2>
                        You are going to simulate a 5-day period of attendance taking based on “Story 1” under the “Story” section in the instruction document.
                        As you go through the events in "Story 1", you are going to fill out the "Attendance" table and update the "Student Status" table. In the 
                        "Attendance" table, a student can be “Present”, “Tardy”, “Absent”, or “Excused”. Whether to enter those exact words or their initials (i.e. 
                        “P”, “T”, “A”, “E”) is your choice, but a student can only be in one of these four states. When you are updating the "Student Status" table, please
                        follow the rules described in the instruction document. Further details of the instruction are also included in that document we sent you via email. 
                        If you did not received the document, please contact ninghan2@illinois.edu.
                        <br/>
                        <h5>Note: </h5>
                        After you finish this part, press the “Complete Simulation” button on your screen and start the next part.  
                        </p>
                        <hr className="my-2" />


                        <p className="margin-one">
                        <h2>Part 2</h2>
                        In this part. you are going to fill out the "Gradebook" table and update the "Student Status" table based on the events described in "Story 2" under the 
                        "Story" section in the instruction document. For the "Gradebook" table, you will need to fill out the grade for each assignment for every student as each 
                        assignment dues. At the end of the story (i.e. end of the semester), you will need to calculate the final grade for each student. The final grade is 
                        calculated as (total_points_earned/total_possible_points) * 100, where the total_points_earned is the sum of the points from all assignments, and the 
                        total_possible_ponts is 1000. For example, if a student earned a total of 850 points, the final grade will be 85. After the semester ends and after you 
                        calculate the final grades for each student, you are going to update the Student Status table (the same table you worked on in Part 1). The rules for how to 
                        update it are described in the instruction document. Further details of the instruction are also included in that document we sent you via email. If you did not 
                        received the document, please contact ninghan2@illinois.edu.
                        <br/>
                        <h5>Note: </h5>
                        After you finish this part, press the “Complete Simulation” button on your screen.  
                        </p>
                        <hr className="my-2" />

                    </ModalBody>
                    <ModalFooter>
                        <Button size='lg' className='display-button' color="info" onClick={this.load_tables}>Got it!</Button>
                    </ModalFooter>
                  </Modal>

                  
                  <Modal size='lg' isOpen={this.state.isNameModalOpen} toggle={this.toggleNameModal}>
                    <ModalHeader toggle={this.toggleNameModal}>Please Enter Your Full Name</ModalHeader>
                    <ModalBody>
                      <Form onSubmit={this.submitName}>
                        <FormGroup>
                          <Label for="user_name">Enter Full Name</Label>
                          <Input type="text" name="name" id="name" onChange={e => this.onNameSubmit(e)} />
                        </FormGroup>
                        <Button size='lg' color="primary" className='single_search_submit' type="submit" >Confirm</Button> {' '}
                      </Form>
                    </ModalBody>
                  </Modal>

                  <Modal size='lg' isOpen={this.state.isRestartModalOpen} toggle={this.toggleRestartModal}>
                    <ModalHeader toggle={this.toggleRestartModal}>Restart/Reload Confirmation</ModalHeader>
                    <ModalBody>
                      Your simulation has been restarted/reloaded.
                    </ModalBody>
                    <ModalFooter>
                      <Button size='lg' className='display-button' color="info" onClick={this.close_restart_comfirmation}>Got It</Button>
                    </ModalFooter>
                  </Modal>

                  <Modal size='lg' isOpen={this.state.isCompleteConfirmationModalOpen} toggle={this.toggleCompleteConfirmModal}>
                    <ModalHeader toggle={this.toggleCompleteConfirmModal}>Complete Confirmation</ModalHeader>
                    <ModalBody>
                      The current part of the simulation has been completed and submitted. If you have completed Part 1, you can work on Part 2 now. 
                      If you have completed Part 2, you can simply close this webpage. If you submitted by mistake or you need to report an error, please contact ninghan2@illinois.edu 
                    </ModalBody>
                    <ModalFooter>
                      <Button size='lg' className='display-button' color="info" onClick={this.close_confirmation}>Got It</Button>
                    </ModalFooter>
                  </Modal>

                  <Modal size='lg' isOpen={this.state.isShowHistoryOpen} toggle={this.toggleShowHistory}>
                    <ModalHeader toggle={this.toggleShowHistory}>File Edit History</ModalHeader>
                    <ModalBody>
                      <Table striped className="history-table">
                        <tbody>
                            {this.state.history.map(line => 
                              <tr key = {line}>
                                <td>{line}</td>
                              </tr>
                            )}
                        </tbody>
                      </Table>
                    </ModalBody>
                    <ModalFooter>
                      <Button size='lg' color="primary" className='single_search_submit' onClick={this.toggleShowHistory}>Close</Button> {' '}
                    </ModalFooter>
                  </Modal>

                  <Modal size='lg' isOpen={this.state.isLoadErrorModelOpen} toggle={this.toggleLoadErrorModal}>
                    <ModalHeader toggle={this.toggleLoadErrorModal}>Load Error!</ModalHeader>
                    <ModalBody>
                      Something went wrong while loading your tables. Please press the "Restart" button on your screen to reload the tables after you close this message. If the error keeps coming up, 
                      contact ninghan2@illinois.edu 
                    </ModalBody>
                    <ModalFooter>
                      <Button size='lg' className='display-button' color="info" onClick={this.toggleLoadErrorModal}>Close Message</Button>
                    </ModalFooter>
                  </Modal>
                  
                        
            </Jumbotron>
        </div>
        {/* <hr /> */}

        <Nav tabs>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '1' })}
                    onClick={() => { this.toggle('1'); }}>
                    Attendance
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '2' })}
                    onClick={() => { this.toggle('2'); }}>
                    Gradebook
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '3' })}
                    onClick={() => { this.toggle('3'); }}>
                    Students
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '4' })}
                    onClick={() => { this.toggle('4'); }}>
                    Team Grades
                </NavLink>
            </NavItem>
            <NavItem>
                <NavLink
                    className={classnames({ active: this.state.activeTab === '5' })}
                    onClick={() => { this.toggle('5'); }}>
                    Team Comments
                </NavLink>
            </NavItem>
        </Nav>
        <TabContent activeTab={this.state.activeTab}>
            <TabPane tabId="1">
                <h4>
                    Attendance
                </h4> 
                {/* onScrollCapture={e => this.track_action(e, "scroll")} */}
                <div id = "display_portion"  tabIndex="1">
                    <HotTable className="handsontable" id ="display_table" data={attendance_display} ref={this.hotTableComponent} id={this.id}
                        colHeaders={true} 
                        rowHeaders={true} 
                        width="100%" 
                        height="300"
                        colWidths="100%"
                        rowHeights="25"
                        contextMenu={true}
                        formulas={true}
                        readOnly={!this.state.transaction_mode}
                    />
                </div>
                    
            </TabPane>
            <TabPane tabId="2">
                <h4>
                    Gradebook
                </h4> 
                <div id = "display_portion" tabIndex="2">
                    <HotTable className="handsontable" id ="display_table" data={greadebook_display} ref={this.hotTableComponent1} id={this.id}
                        colHeaders={true} 
                        rowHeaders={true} 
                        width="100%" 
                        height="300"
                        colWidths="100%"
                        rowHeights="25"
                        contextMenu={true}
                        formulas={true}
                        readOnly={!this.state.transaction_mode}
                    />
                </div>
                    
            </TabPane>
            <TabPane tabId="3">
                <h4>
                    Students
                </h4> 
                <div id = "display_portion" tabIndex="3">
                    <HotTable className="handsontable" id ="display_table" data={students_display} ref={this.hotTableComponent2} id={this.id}
                        colHeaders={true} 
                        rowHeaders={true} 
                        width="100%" 
                        height="300"
                        colWidths="100%"
                        rowHeights="25"
                        contextMenu={true}
                        formulas={true}
                        readOnly={!this.state.transaction_mode}
                    />
                </div>
                    
            </TabPane>
            <TabPane tabId="4">
                <h4>
                    Team Grades
                </h4> 
                <div id = "display_portion" tabIndex="4">
                    <HotTable className="handsontable" id ="display_table" data={team_grades_display} ref={this.hotTableComponent3} id={this.id}
                        colHeaders={true} 
                        rowHeaders={true} 
                        width="100%" 
                        height="300"
                        colWidths="100%"
                        rowHeights="25"
                        contextMenu={true}
                        formulas={true}
                        readOnly={!this.state.transaction_mode}
                    />
                </div>
                    
            </TabPane>
            <TabPane tabId="5">
                <h4>
                    Team Comments
                </h4> 
                <div id = "display_portion" tabIndex="5">
                    <HotTable className="handsontable" id ="display_table" data={team_comments_display} ref={this.hotTableComponent4} id={this.id}
                        colHeaders={true} 
                        rowHeaders={true} 
                        width="100%" 
                        height="300"
                        colWidths="100%"
                        rowHeights="25"
                        contextMenu={true}
                        formulas={true}
                        readOnly={!this.state.transaction_mode}
                    />
                </div>
                    
            </TabPane>
        </TabContent>
          
      </div>

    );
  }
}
export default Academic;
