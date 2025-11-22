
/**
 * @class Result
 * Class holds result of an action. Holds the result, a string,
 * and a bool, indicating whether the action was successful.
 */
class Result {
  /**
   * Constructs a new Result instance.
   * @param {boolean} success of the action
   * @param {string} result if successful: the result, else error.
   * @param {string} warnings found during SBML parsing.
   */
  constructor(success = false, result = 'empty', warnings = 'empty') {
    this.success = success;
	  this.result = result;
    this.warnings = warnings;
  }

  /**
   * 
   * @returns bool: true if action successful, false if failed.
   */
  isSuccess() {
    return this.success;
  }

  /**
   * Returns either model or error string.
   * @returns string
   */
  getResult() {
    return this.result;
  }

 /**
  * Returns any warnings found.
  * @returns string
  */
  getWarnings() {
    return this.warnings;
  }

}

/**
 * @class AntimonyWrapper
 *  This class wraps all the functions exported from emscripten
 *  libantimony.js library into a simpler interface.
 */
class AntimonyWrapper {

  /**
   * Constructs a new AntimonyWrapper instance from the WASM module
   * @param AntimonyModule the WASM module
   */
  constructor(AntimonyModule) {
   //	Format: libantimony.cwrap( function name, return type, input param array of types).
    this.loadString = AntimonyModule.cwrap('loadString', 'number', ['number']);
    this.loadAntimonyString = AntimonyModule.cwrap('loadAntimonyString', 'number', ['number']);
    this.loadSBMLString = AntimonyModule.cwrap('loadSBMLString', 'number', ['number']);
    this.getSBMLString = AntimonyModule.cwrap('getSBMLString', 'string', ['null']);
    this.getAntimonyString = AntimonyModule.cwrap('getAntimonyString', 'string', ['null']);
    this.getCompSBMLString = AntimonyModule.cwrap('getCompSBMLString', 'string', ['string']); 
    this.clearPreviousLoads = AntimonyModule.cwrap('clearPreviousLoads', 'null', ['null']);
    this.getLastError = AntimonyModule.cwrap('getLastError', 'string', ['null']);
    this.getWarnings = AntimonyModule.cwrap('getWarnings', 'string', ['null']);
    this.getSBMLInfoMessages = AntimonyModule.cwrap('getSBMLInfoMessages', 'string', ['string']);
    this.getSBMLWarnings = AntimonyModule.cwrap('getSBMLWarnings', 'string', ['string']);
    this.freeAll = AntimonyModule.cwrap('freeAll', 'null', ['null']);
    // Emscripten funcs (direct calls):
    this.jsFree = (strPtr) => AntimonyModule._free(strPtr); 
    this.jsAllocateUTF8 = (newStr) =>  AntimonyModule.allocateUTF8(newStr); 
    // Do not need?:
    this.jsUTF8ToString = (strPtr) => AntimonyModule.UTF8ToString(strPtr);
 
	}

  /**
   * Converts antimony model to an SBML model.
   * @param {string} antCode the antimony model to be converted.
   * @returns Result instance of the model conversion to SBML
   */
  convertAntimonyToSBML(antCode) {
    this.clearPreviousLoads();
    var newResult;
    var sbmlResult;
    var warnings = '';
    var ptrAntCode = this.jsAllocateUTF8(antCode);
    var load_int= this.loadAntimonyString(ptrAntCode);
    warnings = this.getSBMLWarnings();
    //console.log("loadAntimonyString(): int returned: ", load_int);
    if (load_int > 0) {
      sbmlResult = this.getSBMLString();
      newResult = new Result(true, sbmlResult, warnings); 
    }
    else { 
      var errStr = this.getLastError();
      //console.log('error:', errStr);
      newResult = new Result(false, errStr, warnings); 
    }
    //console.log('Warnings: ', warnings);
    this.jsFree(ptrAntCode);
    return newResult;
 }

  /**
   * Converts SBML model to an Antimony model.
   * @param {string} sbmlCode the SBML model to be converted.
   * @returns Result instance of the model conversion to Antimony
   */
  convertSBMLToAntimony(sbmlCode) {
    this.clearPreviousLoads();
    var antResult;
    var warnings = '';
    var newResult;
    var ptrSBMLCode = this.jsAllocateUTF8(sbmlCode);
    var load_int= this.loadSBMLString(ptrSBMLCode);
    warnings = this.getSBMLWarnings();
    //console.log("loadSBMLString: int returned: ", load_int);
    if (load_int > 0) {
      antResult = this.getAntimonyString();
      newResult = new Result(true, antResult, warnings);
    }
    else { 
      var errStr = this.getLastError();
      //console.log('error:', errStr);
      newResult = new Result(false, errStr, warnings); 
    }
    this.jsFree(ptrSBMLCode);
    return newResult;
  }

}

// if module is defined, export the AntimonyWrapper class
if (typeof module !== 'undefined') {
  module.exports = AntimonyWrapper;
}