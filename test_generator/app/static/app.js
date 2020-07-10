$(function(){
    $('ul.radio-list,ul.checklist,ul.textbox,ul.codebox').each(function(i, el){
        var questionClass = $(this).attr('class');
        $(this).parent().addClass('question-row').addClass(questionClass);
        if (questionClass=='radio-list') {
            $(this).find('input[type="radio"]').attr('name', 'radio-question-' + i);
        }
    });
    
    var myInterpreter;

    function step() {
      if (myInterpreter.stateStack.length) {
        var node =
            myInterpreter.stateStack[myInterpreter.stateStack.length - 1].node;
        var start = node.start;
        var end = node.end;
      } else {
        var start = 0;
        var end = 0;
      }
      
      try {
        var ok = myInterpreter.step();
        if (!ok) {
          return;
        }
      } finally {
        if (!ok) {
          return;
        }
      }
    }
    
    //userCode=
    //function main() {
    //  var a;
    //  var b;
    //  var c;
    //  a = 5;
    //  b = 1;
    //  c = a+b;
    //}
    //setupObj = {max_cycles:1000, inp_vars:['a','b'],ret_exp:'c',test_exp:['main(1,2)==3','main(4,5)==9','main(8,-8)==0']}
    function runCodeTests(userCode, setupObj) {       
       //console.log(setupObj);
       //начинаем постепенно заменять пользовательский код на заглушечный
       var newCode = userCode;
       if (setupObj.hasOwnProperty("inp_vars")) {
          //замена переменных, если они есть среди входных параметров
          var inpArray = setupObj["inp_vars"];
          for (let i = 0; i < inpArray.length; i++) {
             var reNewVar = new RegExp("var\\s+"+inpArray[i]+"\\s*;");
             newCode = newCode.replace(reNewVar, '');
             var reFirstAssign = new RegExp(inpArray[i]+"\\s*=");
             newCode = newCode.replace(reFirstAssign, '//'+inpArray[i]+'=');
          }
          //Замена заголовка функции
          var reVoidMain = new RegExp("function\\s+main\\(\\s*\\)\\s*\\{");
          var inpParams = inpArray.join(',');
          newCode = newCode.replace(reVoidMain, 'function main('+inpParams+') {');
       }
       if (setupObj.hasOwnProperty("ret_exp")) {
          posFin = newCode.lastIndexOf('}');
          newCode = newCode.substring(0,posFin);
          newCode += 'return '+setupObj["ret_exp"]+';\n}\n';
       }
       
       newCode += "var valid = '';\n";
       if (setupObj.hasOwnProperty("test_exp")) {
          var testArray = setupObj["test_exp"];
          for (let i = 0; i < testArray.length; i++) {
             newCode += "if ("+testArray[i]+") valid+='1'; else valid+='0';\n";
          }
       }
       newCode += "valid+'';\n";
       
       
       console.log(newCode);
       var res = "";
       try {
        myInterpreter = new Interpreter(newCode);
        
        //Запускаем в течение n циклов
        for (let i = 0; i < setupObj["max_cycles"]; i++) {
           step();
        }
        res = myInterpreter.value;
       } catch(e) {
          console.log('Error parse code!');
      }
       
       //выдача финала
       var finishOk = true;
       var testArray = [];
       var ntest = setupObj["test_exp"].length;
       for (let i = 0; i < ntest; i++) {
          testArray.push('?');
       }
       var ansLen = ntest < res.length ? ntest : res.length;
       if (ntest == res.length) finishOk = true;
       else finishOk = false;
       for (let i = 0; i < ansLen; i++) {
          if (res.charAt(i) == 1) { 
             testArray[i]='1';
          }
          else if (res.charAt(i) == 0) {
             finishOk = false;
             testArray[i]='0';
          } else {
             finishOk = false;
          }
       }
       result = {ntest: ntest,ans: testArray,ok: finishOk}
       console.log('Finished! Res='+res+' out= '+JSON.stringify(result));
       return result;
    }

    function convertLinkToSets(link, setSema, setProc, setSkill) {
       tag_array = link.trim().split(",");
       for (let i = 0; i < tag_array.length; i++) {
          var tag = tag_array[i].trim()
          if (tag.length > 0) {
            if (tag.charAt(0) == 'p') {
               setProc.add(tag_array[i]);
            } else if (tag.charAt(0) == 's') {
               setSkill.add(tag_array[i]);
            } else {
               setSema.add(tag_array[i]);
            }
          }
       }
    }

    function checkQuestion() {
        resetQuestions(true);
        var questions = $('li.question-row');
        var total_questions = questions.length;
        var correct = 0;
        var corrSemaSet = new Set();
        var corrProcSet = new Set();
        var corrSkillSet = new Set();
        
        var failSemaSet = new Set();
        var failProcSet = new Set();
        var failSkillSet = new Set();

        questions.each(function(i, el) {
            var self = $(this);
            // Single Question.
            if (self.hasClass('radio-list')) {
                var ok = false;
                if (self.find('input[type="radio"][data-content="1"]:checked').length == 1) {
                    correct += 1;
                    ok = true;
                } else {
                    self.addClass('text-danger');
                }
                
                var linkItems = self.find('input[type="radio"][data-link!=""]');
                linkItems.each(function(idx, li) {
                    var link = $(li);
                    if (ok) convertLinkToSets(link.attr("data-link"),corrSemaSet,corrProcSet,corrSkillSet);
                    else convertLinkToSets(link.attr("data-link"),failSemaSet,failProcSet,failSkillSet);
                });
                
            }
            // Textbox Question.
            if(self.hasClass('textbox')) {
                var textbox = self.find('input[type="text"]');
                var correct_text = String(textbox.data("content")).trim().split("").reverse().join("");
                var ok = false;
                if(String(textbox.val()).trim().toLowerCase()==correct_text.toLowerCase()) {
                    correct += 1;
                    ok = true;
                } else {                    
                    self.addClass('text-danger');
                    textbox.parent().find("i.text-correct").html(correct_text);
                }
                
                var linkItems = self.find('input[type="text"][data-link!=""]');
                linkItems.each(function(idx, li) {
                    var link = $(li);
                    if (ok) convertLinkToSets(link.attr("data-link"),corrSemaSet,corrProcSet,corrSkillSet);
                    else convertLinkToSets(link.attr("data-link"),failSemaSet,failProcSet,failSkillSet);
                });
            }
            // Multiple selection Questions.
            if(self.hasClass('checklist')) {
                var total_corrects = self.find('input[type="checkbox"][data-content="1"]').length;
                var total_incorrects = self.find('input[type="checkbox"][data-content="0"]').length;
                var correct_selected = self.find('input[type="checkbox"][data-content="1"]:checked').length;
                var incorrect_selected = self.find('input[type="checkbox"][data-content="0"]:checked').length;
                var qc = +((correct_selected / total_corrects) - (incorrect_selected/total_incorrects)).toFixed(2);
                if (qc < 0) {
                    qc = 0;
                }
                correct += qc;
                var ok = true;
                if (qc == 0) {
                    self.addClass('text-danger');
                    ok = false;
                } else if (qc > 0 && qc < 1) {
                    self.addClass('text-warning');
                    displayLinks = false;
                }
                
                var linkItems = self.find('input[type="checkbox"][data-link!=""]');
                linkItems.each(function(idx, li) {
                     var link = $(li);
                     if (ok) convertLinkToSets(link.attr("data-link"),corrSemaSet,corrProcSet,corrSkillSet);
                     else convertLinkToSets(link.attr("data-link"),failSemaSet,failProcSet,failSkillSet);
                });
            }
            //Codebox
            if(self.hasClass('codebox')) {
                var codebox = self.find('textarea');
                var test_code = String(codebox.data("content"));
                test_code=test_code.replace("max_cycles","\"max_cycles\"");
                test_code=test_code.replace("inp_vars","\"inp_vars\"");
                test_code=test_code.replace("ret_exp","\"ret_exp\"");
                test_code=test_code.replace("test_exp","\"test_exp\"");
                test_code=test_code.replace(/'/g,"\"");
                console.log( "Codebox test code="+test_code);
                var setup_obj = JSON.parse(test_code);
                var input_code = codebox.val();
                console.log( " input code="+input_code);
                res = runCodeTests(input_code,setup_obj);
                var ok = false;
                if (res["ok"]) {
                   correct += 1;
                   ok = true;
                }
                
                var linkItems = self.find('textarea[type="text"][data-link!=""]');
                linkItems.each(function(idx, li) {
                    var link = $(li);
                    if (ok) convertLinkToSets(link.attr("data-link"),corrSemaSet,corrProcSet,corrSkillSet);
                    else convertLinkToSets(link.attr("data-link"),failSemaSet,failProcSet,failSkillSet);
                });
                self.addClass('text-danger');
            }
        });
        
        //строим объект для диагностической таблицы
        var pageName = window.location.href.substring(window.location.href.lastIndexOf('/') + 1);
        if (pageName.trim()=="") {
            pageName = window.location.href.substring(0,window.location.href.lastIndexOf('/'));
            pageName = pageName.substring(pageName.lastIndexOf('/') + 1);
        }
		if (pageName=="") pageName="root";
		pageName = "um_" + pageName;
        console.log("Gen page name: "+pageName)
		
        var modelRes = {
		   time: Date.now(),
		   page: pageName,
           correct: {
              f : Array.from(corrSemaSet),
              p : Array.from(corrProcSet),
              s : Array.from(corrSkillSet)
           },
           fail: {
              f : Array.from(failSemaSet),
              p : Array.from(failProcSet),
              s : Array.from(failSkillSet)
           }
        }

        var diagTable = JSON.stringify(modelRes);
        //Если нет такого параметра, в хранилище, то добавляем
        if (!localStorage.hasOwnProperty(pageName)) {
           localStorage.setItem(pageName,diagTable);
        } else {
           diagTable = "Уже была сформирована!";
        }
        showScore(correct, total_questions, diagTable);
    }

    function showScore(correct, total, diag) {
        var score = (correct / total).toFixed(2) * 100;
        var msgClass = 'alert-danger';
        var diagText = '';
        if (score < 100) {
           diagText = 'Диагностический скрипт: '+diag;
        }
        if (score >= 70) {
            msgClass = 'alert-success';
        } else if (score >= 50) {
            msgClass = 'alert-warning';
        }
        $('#tg-correct-questions').text(correct + ' из ' + total);
        $('#tg-score').text(score);
        $('#tg-diag').text(diagText);
        $('#tg-msg').addClass(msgClass).show();
    }
    function resetQuestions(keep) {
        $('li.question-row').removeClass('text-danger').removeClass('text-warning');
        $('i.text-correct').html('');
        $('#tg-msg').removeClass('alert-danger').removeClass('alert-success').removeClass('alert-warning').hide();
        if(keep === true) {
            return;
        }
        $('li.question-row').find('input[type="text"]').val('');
        $('li.question-row').find('input[type="radio"],input[type="checkbox"]').prop('checked', false);
    }
    $('#check-questions').on('click', checkQuestion);
    $('#reset-questions').on('click', resetQuestions);

});