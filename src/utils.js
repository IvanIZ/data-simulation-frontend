class Utils {
    load_simulation_v2 = (index, simulation_type, buffer, error_indicater, col_headers) => {
        console.log("simulation type is: ", simulation_type);
        this.fill_col_headers(col_headers, simulation_type);
        let simulation = "";
        if (simulation_type === "attendance" || simulation_type === "grade_book" || simulation_type === "student_status" || simulation_type === "students" || simulation_type === "team_grades" || simulation_type === "team_comments") {
            simulation = "academic";
        }
        else if (simulation_type === "employee_schedule_v1" || simulation_type === "employee_schedule_v2" || simulation_type === "progress_log") {
            simulation = "management";
        } else if (simulation_type === "check_book" || simulation_type === "monthly_expense" || simulation_type === "monthly_income" || simulation_type === "check_book2" || simulation_type === "check_book3" || simulation_type === "allowance") {
            simulation = "financing";
        }

        let ATT_NUM = 0;
        if (simulation_type === "attendance") {
            ATT_NUM = 18;
        } else if (simulation_type === "grade_book") {
            ATT_NUM = 8;
        }
        else if (simulation_type === "check_book" || simulation_type === "check_book2" || simulation_type === "check_book3") {
            ATT_NUM = 6;
        } else if (simulation_type === "monthly_expense") {
            ATT_NUM = 13;
        } else if (simulation_type === "monthly_income") {
            ATT_NUM = 14;
        } else if (simulation_type === "employee_schedule_v1") {
            ATT_NUM = 9;
        } else if (simulation_type === "employee_schedule_v2") {
            ATT_NUM = 8;
        } else if (simulation_type === "progress_log") {
            ATT_NUM = 7;
        } else if (simulation_type === "student_status") {
            ATT_NUM = 6;
        } else if (simulation_type === "students") {
            ATT_NUM = 4;
        } else if (simulation_type === "team_grades") {
            ATT_NUM = 6;
        } else if (simulation_type === "team_comments") {
            ATT_NUM = 3;
        } else if (simulation_type === "allowance") {
            ATT_NUM = 2;
        }

        let url = 'https://spreadsheetactions.herokuapp.com' +  '/' + simulation + '/' + simulation_type + '/fetch-fifty-rows/' + index
        console.log("the fetch url is: ", url);
        fetch(url)
        .then(res => res.json())      
        .then(data => {
            if (data.length === 0) {
                console.log("No data is fetched by fetchMoreRows function");
                this.add_empty_rows(50, ATT_NUM, buffer);
            } else {
                console.log(data)
                //load returned data into the buffer
                for (var i = 0; i < data.length; i++) {

                    var temp = []
                    for (var j = 0; j < ATT_NUM; j++) {
                        if (simulation_type === "attendance") {  // attendance
                            if (j === 0) {temp[j] = data[i]['NetID'];}
                            if (j === 1) { temp[j] = data[i]['name'];}
                            if (j === 2) {temp[j] = data[i]['Week1']}
                            if (j === 3) {temp[j] = data[i]['Week2']}
                            if (j === 4) {temp[j] = data[i]['Week3']}
                            if (j === 5) {temp[j] = data[i]['Week4']}
                            if (j === 6) {temp[j] = data[i]['Week5']}
                            if (j === 7) {temp[j] = data[i]['Week6']}
                            if (j === 8) {temp[j] = data[i]['Week7']}
                            if (j === 9) {temp[j] = data[i]['Week8']}
                            if (j === 10) {temp[j] = data[i]['Week9']}
                            if (j === 11) {temp[j] = data[i]['Week10']}
                            if (j === 12) {temp[j] = data[i]['Week11']}
                            if (j === 13) {temp[j] = data[i]['Week12']}
                            if (j === 14) {temp[j] = data[i]['Week13']}
                            if (j === 15) {temp[j] = data[i]['Week14']}
                            if (j === 16) {temp[j] = data[i]['Week15']}
                            if (j === 17) {temp[j] = data[i]['Week16']}
                        }
                        if (simulation_type === "grade_book") {      // grade book 
                            if (j === 0) {temp[j] = data[i]['NetID']}
                            if (j === 1) {temp[j] = data[i]['name']}
                            if (j === 2) {temp[j] = data[i]['MP']}
                            if (j === 3) {temp[j] = data[i]['Lab']}
                            if (j === 4) {temp[j] = data[i]['Final']}
                            if (j === 5) {temp[j] = data[i]['Participation']}
                            if (j === 6) {temp[j] = data[i]['Project']}
                            if (j === 7) {temp[j] = data[i]['Overall']}
                        } else if (simulation_type === "check_book" || simulation_type === "check_book2" || simulation_type === "check_book3") {    // check book 1, 2, 3
                            if (j === 0) {temp[j] = data[i]['number']}
                            if (j === 1) {temp[j] = data[i]['date']}
                            if (j === 2) {temp[j] = data[i]['transaction']}
                            if (j === 3) {temp[j] = data[i]['withdraw']}
                            if (j === 4) {temp[j] = data[i]['deposit']}
                            if (j === 5) {temp[j] = data[i]['balance']}
                        } else if (simulation_type === "monthly_expense") { // monthly expense
                            if (j === 0) {temp[j] = data[i]['category']}
                            if (j === 1) {temp[j] = data[i]['Jan']}
                            if (j === 2) {temp[j] = data[i]['Feb']}
                            if (j === 3) {temp[j] = data[i]['Mar']}
                            if (j === 4) {temp[j] = data[i]['Apr']}
                            if (j === 5) {temp[j] = data[i]['May']}
                            if (j === 6) {temp[j] = data[i]['Jun']}
                            if (j === 7) {temp[j] = data[i]['Jul']}
                            if (j === 8) {temp[j] = data[i]['Aug']}
                            if (j === 9) {temp[j] = data[i]['Sep']}
                            if (j === 10) {temp[j] = data[i]['Oct']}
                            if (j === 11) {temp[j] = data[i]['Nov']}
                            if (j === 12) {temp[j] = data[i]['Dec']}
                        } else if (simulation_type === "monthly_income") { // monthly income
                            if (j === 0) {temp[j] = data[i]['id']}
                            if (j === 1) {temp[j] = data[i]['income_type']}
                            if (j === 2) {temp[j] = data[i]['Jan']}
                            if (j === 3) {temp[j] = data[i]['Feb']}
                            if (j === 4) {temp[j] = data[i]['Mar']}
                            if (j === 5) {temp[j] = data[i]['Apr']}
                            if (j === 6) {temp[j] = data[i]['May']}
                            if (j === 7) {temp[j] = data[i]['Jun']}
                            if (j === 8) {temp[j] = data[i]['Jul']}
                            if (j === 9) {temp[j] = data[i]['Aug']}
                            if (j === 10) {temp[j] = data[i]['Sep']}
                            if (j === 11) {temp[j] = data[i]['Oct']}
                            if (j === 12) {temp[j] = data[i]['Nov']}
                            if (j === 13) {temp[j] = data[i]['Dec']}
                        } else if (simulation_type === "employee_schedule_v1") {   // schedule v1
                            if (j === 0) {temp[j] = data[i]['emp_id']}
                            if (j === 1) {temp[j] = data[i]['name']}
                            if (j === 2) {temp[j] = data[i]['Monday']}
                            if (j === 3) {temp[j] = data[i]['Tuesday']}
                            if (j === 4) {temp[j] = data[i]['Wednesday']}
                            if (j === 5) {temp[j] = data[i]['Thursday']}
                            if (j === 6) {temp[j] = data[i]['Friday']}
                            if (j === 7) {temp[j] = data[i]['Saturday']}
                            if (j === 8) {temp[j] = data[i]['Sunday']}
                        } else if (simulation_type === "employee_schedule_v2") {   // schedule v2
                            if (j === 1) {temp[j] = data[i]['time_slot']}
                            if (j === 2) {temp[j] = data[i]['Monday']}
                            if (j === 3) {temp[j] = data[i]['Tuesday']}
                            if (j === 4) {temp[j] = data[i]['Wednesday']}
                            if (j === 5) {temp[j] = data[i]['Thursday']}
                            if (j === 6) {temp[j] = data[i]['Friday']}
                            if (j === 7) {temp[j] = data[i]['Saturday']}
                            if (j === 8) {temp[j] = data[i]['Sunday']}
                        } else if (simulation_type === "progress_log") {  // progress log
                            if (j === 0) {temp[j] = data[i]['task_id']}
                            if (j === 1) {temp[j] = data[i]['task']}
                            if (j === 2) {temp[j] = data[i]['deadline']}
                            if (j === 3) {temp[j] = data[i]['emp_id']}
                            if (j === 4) {temp[j] = data[i]['name']}
                            if (j === 5) {temp[j] = data[i]['hour_spent']}
                            if (j === 6) {temp[j] = data[i]['progress']}
                        } else if (simulation_type === "student_status") {  // student status
                            if (j === 0) {temp[j] = data[i]['ID']}
                            if (j === 1) {temp[j] = data[i]['name']}
                            if (j === 2) {temp[j] = data[i]['tardy']}
                            if (j === 3) {temp[j] = data[i]['absent']}
                            if (j === 4) {temp[j] = data[i]['disciplinary action']}
                            if (j === 5) {temp[j] = data[i]['status']}
                        } else if (simulation_type === "students") { // students
                            if (j === 0) {temp[j] = data[i]['NetID']}
                            if (j === 1) {temp[j] = data[i]['name']}
                            if (j === 2) {temp[j] = data[i]['email']}
                            if (j === 3) {temp[j] = data[i]['team']}
                        } else if (simulation_type === "team_grades") { // team grades
                            if (j === 0) {temp[j] = data[i]['team']}
                            if (j === 1) {temp[j] = data[i]['presentation']}
                            if (j === 2) {temp[j] = data[i]['codes']}
                            if (j === 3) {temp[j] = data[i]['report']}
                            if (j === 4) {temp[j] = data[i]['Peer_Reviews']}
                            if (j === 5) {temp[j] = data[i]['overall']}
                        } else if (simulation_type === "team_comments") { //team comments
                            if (j === 0) {temp[j] = data[i]['Team']}
                            if (j === 1) {temp[j] = data[i]['comment1']}
                            if (j === 2) {temp[j] = data[i]['comment2']}
                        } else if (simulation_type === "allowance") {
                            if (j === 0) {temp[j] = data[i]['child']}
                            if (j === 1) {temp[j] = data[i]['allowance']}
                        }
                    }

                    // buffer[i] = temp;
                    buffer.push(temp.slice());
                    // return buffer;
                }

                this.add_empty_rows(10, ATT_NUM, buffer);
            }
        }, (error) => {
            if (error) {
                error_indicater[0][0] = 1;
            }
        });
    }

    load_simulation_v3 = (index, simulation_type, buffer, buffer_copy, col_headers) => {
        console.log("simulation type is: ", simulation_type);
        this.fill_col_headers(col_headers, simulation_type);

        let ATT_NUM = 0;
        if (simulation_type === "attendance") {
            this.load_attendance(buffer);
            ATT_NUM = 9;
            this.add_empty_rows(10, ATT_NUM, buffer);

        } else if (simulation_type === "grade_book") {
            this.load_gradebook(buffer);
            ATT_NUM = 13;
            this.add_empty_rows(10, ATT_NUM, buffer);

        }
        else if (simulation_type === "check_book") {
            ATT_NUM = 6;
            this.add_empty_rows(25, ATT_NUM, buffer);

        } else if (simulation_type === "monthly_expense") {
            ATT_NUM = 13;
            this.add_empty_rows(25, ATT_NUM, buffer);

        } else if (simulation_type === "monthly_income") {
            ATT_NUM = 13;
            this.add_empty_rows(25, ATT_NUM, buffer);

        } else if (simulation_type === "employee_schedule_v1") {
            ATT_NUM = 9;
            this.add_empty_rows(25, ATT_NUM, buffer);

        } else if (simulation_type === "employee_schedule_v2") {
            ATT_NUM = 8;
            this.load_employee_schedule_v2(buffer);
            this.add_empty_rows(5, ATT_NUM, buffer);

        } else if (simulation_type === "progress_log") {
            ATT_NUM = 7;
            this.add_empty_rows(25, ATT_NUM, buffer);

        } else if (simulation_type === "student_status") {
            this.load_student_status(buffer);
            ATT_NUM = 6;
            this.add_empty_rows(10, ATT_NUM, buffer);
        }         
    }

    load_attendance = (buffer) => {
        buffer.push(["00001", "Ivan", "", "", "", "", "", "", ""]);
        buffer.push(["00002", "John", "", "", "", "", "", "", ""]);
        buffer.push(["00003", "Rick", "", "", "", "", "", "", ""]);
        buffer.push(["00004", "Brian", "", "", "", "", "", "", ""]);
        buffer.push(["00005", "Arthur", "", "", "", "", "", "", ""]);
        buffer.push(["00006", "Emily", "", "", "", "", "", "", ""]);
        buffer.push(["00007", "Ken", "", "", "", "", "", "", ""]);
        buffer.push(["00008", "Iris", "", "", "", "", "", "", ""]);
        buffer.push(["00009", "Maggie", "", "", "", "", "", "", ""]);
        buffer.push(["00010", "Hermosa", "", "", "", "", "", "", ""]);
        buffer.push(["00011", "Henry", "", "", "", "", "", "", ""]);
        buffer.push(["00012", "Oliver", "", "", "", "", "", "", ""]);
        buffer.push(["00013", "Jack", "", "", "", "", "", "", ""]);
        buffer.push(["00014", "Jacob", "", "", "", "", "", "", ""]);
        buffer.push(["00015", "Charlie", "", "", "", "", "", "", ""]);
        buffer.push(["00016", "Tomas", "", "", "", "", "", "", ""]);
        buffer.push(["00017", "George", "", "", "", "", "", "", ""]);
        buffer.push(["00018", "Joe", "", "", "", "", "", "", ""]);
        buffer.push(["00019", "Reece", "", "", "", "", "", "", ""]);
        buffer.push(["00020", "Daniel", "", "", "", "", "", "", ""]);
        buffer.push(["00021", "Kyle", "", "", "", "", "", "", ""]);
        buffer.push(["00022", "David", "", "", "", "", "", "", ""]);
        buffer.push(["00023", "Oscar", "", "", "", "", "", "", ""]);
        buffer.push(["00024", "Snow", "", "", "", "", "", "", ""]);
        buffer.push(["00025", "Williams", "", "", "", "", "", "", ""]);
        buffer.push(["00026", "Levy", "", "", "", "", "", "", ""]);
        buffer.push(["00027", "Peter", "", "", "", "", "", "", ""]);
        buffer.push(["00028", "Aoi", "", "", "", "", "", "", ""]);
        buffer.push(["00029", "Tanaka", "", "", "", "", "", "", ""]);
        buffer.push(["00030", "Jake", "", "", "", "", "", "", ""]);
        buffer.push(["00031", "Isla", "", "", "", "", "", "", ""]);
    }

    load_gradebook = (buffer) => {
        buffer.push(["00001", "Ivan", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00002", "John", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00003", "Rick", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00004", "Brian", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00005", "Arthur", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00006", "Emily", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00007", "Ken", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00008", "Iris", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00009", "Maggie", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00010", "Hermosa", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00011", "Henry", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00012", "Oliver", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00013", "Jack", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00014", "Jacob", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00015", "Charlie", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00016", "Tomas", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00017", "George", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00018", "Joe", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00019", "Reece", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00020", "Daniel", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00021", "Kyle", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00022", "David", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00023", "Oscar", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00024", "Snow", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00025", "Williams", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00026", "Levy", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00027", "Peter", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00028", "Aoi", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00029", "Tanaka", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00030", "Jake", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
        buffer.push(["00031", "Isla", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    }

    load_student_status = (buffer) => {
        buffer.push(["00001", "Ivan", "", "", "", ""]);
        buffer.push(["00002", "John", "", "", "", ""]);
        buffer.push(["00003", "Rick", "", "", "", ""]);
        buffer.push(["00004", "Brian", "", "", "", ""]);
        buffer.push(["00005", "Arthur", "", "", "", ""]);
        buffer.push(["00006", "Emily", "", "", "", ""]);
        buffer.push(["00007", "Ken", "", "", "", ""]);
        buffer.push(["00008", "Iris", "", "", "", ""]);
        buffer.push(["00009", "Maggie", "", "", "", ""]);
        buffer.push(["00010", "Hermosa", "", "", "", ""]);
        buffer.push(["00011", "Henry", "", "", "", ""]);
        buffer.push(["00012", "Oliver", "", "", "", ""]);
        buffer.push(["00013", "Jack", "", "", "", ""]);
        buffer.push(["00014", "Jacob", "", "", "", ""]);
        buffer.push(["00015", "Charlie", "", "", "", ""]);
        buffer.push(["00016", "Tomas", "", "", "", ""]);
        buffer.push(["00017", "George", "", "", "", ""]);
        buffer.push(["00018", "Joe", "", "", "", ""]);
        buffer.push(["00019", "Reece", "", "", "", ""]);
        buffer.push(["00020", "Daniel", "", "", "", ""]);
        buffer.push(["00021", "Kyle", "", "", "", ""]);
        buffer.push(["00022", "David", "", "", "", ""]);
        buffer.push(["00023", "Oscar", "", "", "", ""]);
        buffer.push(["00024", "Snow", "", "", "", ""]);
        buffer.push(["00025", "Williams", "", "", "", ""]);
        buffer.push(["00026", "Levy", "", "", "", ""]);
        buffer.push(["00027", "Peter", "", "", "", ""]);
        buffer.push(["00028", "Aoi", "", "", "", ""]);
        buffer.push(["00029", "Tanaka", "", "", "", ""]);
        buffer.push(["00030", "Jake", "", "", "", ""]);
        buffer.push(["00031", "Isla", "", "", "", ""]);
    }

    load_employee_schedule_v2 = (buffer) => {
        buffer.push(["8AM-9AM", "", "", "", "", "", "", ""]);
        buffer.push(["9AM-10AM", "", "", "", "", "", "", ""]);
        buffer.push(["10AM-11AM", "", "", "", "", "", "", ""]);
        buffer.push(["11AM-12PM", "", "", "", "", "", "", ""]);
        buffer.push(["12PM-1PM", "", "", "", "", "", "", ""]);
        buffer.push(["1PM-2PM", "", "", "", "", "", "", ""]);
        buffer.push(["2PM-3PM", "", "", "", "", "", "", ""]);
        buffer.push(["3PM-4PM", "", "", "", "", "", "", ""]);
        buffer.push(["4PM-5PM", "", "", "", "", "", "", ""]);
        buffer.push(["5PM-6PM", "", "", "", "", "", "", ""]);
        buffer.push(["6PM-7PM", "", "", "", "", "", "", ""]);
        buffer.push(["7PM-8PM", "", "", "", "", "", "", ""]);
        buffer.push(["8PM-9AP", "", "", "", "", "", "", ""]);
    }

    fill_col_headers = (col_head, simulation_type) => {
        if (simulation_type === "attendance") {  // attendance
            col_head.push("NetID");
            col_head.push("Name");
            col_head.push("Week1");
            col_head.push("Week2");
            col_head.push("Week3");
            col_head.push("Week4");
            col_head.push("Week5");
            col_head.push("Week6");
            col_head.push("Week7");
            col_head.push("Week8");
            col_head.push("Week9");
            col_head.push("Week10");
            col_head.push("Week11");
            col_head.push("Week12");
            col_head.push("Week13");
            col_head.push("Week14");
            col_head.push("Week15");
            col_head.push("Week16");
        }
        if (simulation_type === "grade_book") {  // grade book
            col_head.push("NetID");
            col_head.push("Name");
            col_head.push("MP (30)");
            col_head.push("Lab (20)");
            col_head.push("Final (20)");
            col_head.push("Participation (10)");
            col_head.push("Project (20)");
            col_head.push("Overall (100)");
        }
        if (simulation_type === "check_book" || simulation_type === "check_book2" || simulation_type === "check_book3") {  // check book
            col_head.push("Number");
            col_head.push("Date");
            col_head.push("Transaction");
            col_head.push("Withdraw");
            col_head.push("Deposit");
            col_head.push("Balance");
        }
        if (simulation_type === "monthly_expense") { // monthly expense
            col_head.push("Category");
            col_head.push("Jan");
            col_head.push("Feb");
            col_head.push("Mar");
            col_head.push("Apr");
            col_head.push("May");
            col_head.push("Jun");
            col_head.push("Jul");
            col_head.push("Aug");
            col_head.push("Sep");
            col_head.push("Oct");
            col_head.push("Nov");
            col_head.push("Dec");
        }
        if (simulation_type === "monthly_income") { // monthly income
            col_head.push("Category");
            col_head.push("Jan");
            col_head.push("Feb");
            col_head.push("Mar");
            col_head.push("Apr");
            col_head.push("May");
            col_head.push("Jun");
            col_head.push("Jul");
            col_head.push("Aug");
            col_head.push("Sep");
            col_head.push("Oct");
            col_head.push("Nov");
            col_head.push("Dec");
        }
        if (simulation_type === "employee_schedule_v1") { // schedule v1
            col_head.push("Employee ID");
            col_head.push("Name");
            col_head.push("Monday");
            col_head.push("Tuesday");
            col_head.push("Wednesday");
            col_head.push("Thursday");
            col_head.push("Friday");
            col_head.push("Saturday");
            col_head.push("Sunday");
        }
        if (simulation_type === "employee_schedule_v2") { // schedule v2
            col_head.push("Time Slot");
            col_head.push("Monday");
            col_head.push("Tuesday");
            col_head.push("Wednesday");
            col_head.push("Thursday");
            col_head.push("Friday");
            col_head.push("Saturday");
            col_head.push("Sunday");
        }
        if (simulation_type === "progress_log") { // progress log
            col_head.push("Task ID");
            col_head.push("Task");
            col_head.push("Deadline");
            col_head.push("Employee ID");
            col_head.push("Name");
            col_head.push("Hours Spent");
            col_head.push("Status");
        }

        if (simulation_type === "student_status") { // student status
            col_head.push("ID");
            col_head.push("Name");
            col_head.push("Tardy");
            col_head.push("Absent");
            col_head.push("Disciplinary Action");
            col_head.push("Status");
        }

        if (simulation_type === "students") { // students
            col_head.push("NetID");
            col_head.push("Name");
            col_head.push("Email");
            col_head.push("Team");
        }

        if (simulation_type === "team_grades") { // team grades
            col_head.push("Team");
            col_head.push("Presentation (20)");
            col_head.push("Codes (40)");
            col_head.push("Report (20)");
            col_head.push("Peer Reviews (20)");
            col_head.push("Overall (100)");
        }

        if (simulation_type === "team_comments") {  // team comments
            col_head.push("Team");
            col_head.push("Comment1");
            col_head.push("Comment2");
        }   

        if (simulation_type === "allowance") {  // allowance
            col_head.push("Child");
            col_head.push("Allowance");
        }
    }

    add_empty_rows = (num_row, num_att, buffer) => {
        console.log("adding more rows!");
        for (var i = 0; i < num_row; i++) {
            let temp = []
            for (var j = 0; j < num_att; j++) {
                temp.push("");
            }
            buffer[buffer.length] = temp;
        }
    }
}
module.exports = Utils