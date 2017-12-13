import { h, render, Component } from 'preact';
import contract from 'truffle-contract';

import web3Helper from './web3Helper';
import socketHelper from './socketHelper';

import gameManager from '../../../solidity/build/contracts/GameManager.json';

class FinishedGame extends Component {

    constructor(props) {
        super(props);

        //grab the score
        const scoreInStorage = localStorage.getItem('score');

        let score = [];

        if (scoreInStorage) {
            score = JSON.parse(scoreInStorage);
        }

        this.state = {
            web3: null,
            numPlayersVoted: 0,
            score,
            address: '',
            gameManagerInstance: null,
            usersWhoVoted: []
        };

        console.log(score);

        this.socket = socketHelper();

        this.socket.on('in-voting', (inVoting, votes) => {
            if(!inVoting) {
                window.location.href = "/";
            }

            this.setState({
                numPlayersVoted: votes.length,
                usersWhoVoted: votes
            });
        });



        this.submitState = this.submitState.bind(this);
        this.parseStateForContract = this.parseStateForContract.bind(this);  

    }

    async componentWillMount() {

        this.socket.emit('in-voting');

        web3Helper.then(async (results) => {
          const web3 = results.web3Instance;

          const gameManagerContract = contract(gameManager);
          gameManagerContract.setProvider(web3.currentProvider);

          try {
            const gameManagerInstance = await gameManagerContract.at("0x5a082c7e7d01d358a49ddbb9f7407ccf4e452a87");
            
            gameManagerInstance.GameFinalized((err, res) => {
                if (err) {
                    reject(err);
                }
    
                this.setState({
                    numPlayersVoted: this.state.numPlayersVoted++
                });
    
                resolve(res);
            });

            this.setState({
                gameManagerInstance,
            });
            
          } catch(err) {
              console.log(err);
          }


          this.setState({
              web3,
              address: web3.eth.accounts[0]
          });
        });
    }

    async submitState() {
        console.log("Submit state called");
        try {
    
          const user = localStorage.getItem(this.state.address);
    
          if(user) {

            const state = this.parseStateForContract();

            try {
                await this.state.gameManagerInstance.gameEnds(state, JSON.parse(user).position, {from: this.state.address}); 
                
                // send to server
                this.socket.emit('voted', user.userName);

                console.log("Vote casted!!");

                this.setState({
                    numPlayersVoted: this.state.numPlayersVoted++
                });

            } catch(err) {
                console.log(err);
            }
            
          } else {
            console.log("Unable to find the user, call the server");
          }
    
    
        } catch(err) {
          console.log(err);
        }
    }

    parseStateForContract() {
        return this.state.score.map(s => s.score);
    }

    render() {
        return (
            <div className="row login_box">
            <div className="col-md-12 col-xs-12" align="center">
                <div className="line">
                    <h3>Game is Done!</h3>
                </div>
            </div>
            <div className="col-md-6 col-xs-6 follow line" align="center">
                <h3>
                    {this.state.numPlayersVoted}/5 <br/> <span>People voted!</span>
                </h3>
            </div>
            <div className="col-md-6 col-xs-6 follow line" align="center">
                <h3>
                     1000 BT<br/> <span>Tokens for entry</span>
                </h3>
            </div>

            <div className="col-md-12 col-xs-12" align="center">
                
            </div>
            
            <div className="col-md-12 col-xs-12 login_control">
                    
                    <div align="center">
                         <button className="btn btn-orange" onClick={ this.submitState }>Finalize Game</button>
                    </div>
                    
            </div>

            {
                this.state.usersWhoVoted.length > 0 &&
                <div className="joined-users">
                    <h3>Joined users: </h3>
                    <ul className="joined-users-list">
                      {
                        this.state.usersWhoVoted.map((user, i) => (
                          <li key={user.userName}>
                            {user.userName} Voted!
                          </li>
                        ))
                      }
                    </ul>
                </div>
            }
        </div>
        );
    }
};

export default FinishedGame;