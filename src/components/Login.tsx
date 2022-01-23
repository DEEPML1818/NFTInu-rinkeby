
import { Button, Navbar, Badge } from 'react-bootstrap';
import { useEffect, useState } from 'react';

import LoginService from '../utils/LoginService';
import { ethers } from 'ethers';

function Login() {
    const [walletAddress, setWalletAddress] = useState(LoginService.getInstance().walletAddress);
    const [chainName, setChainName] = useState(LoginService.getInstance().chainName);
    const changeWalletAddress = (provider: ethers.providers.Web3Provider, signer: ethers.Signer, walletAddress: string) => {
        setWalletAddress(walletAddress);
        setChainName(LoginService.getInstance().chainName);
    };
    const onChainChange = () => {
        setChainName(LoginService.getInstance().chainName);
    };

    useEffect(() => {
        LoginService.getInstance().onLogin(changeWalletAddress);
        LoginService.getInstance().onChainChanged(onChainChange);
        return () => {
            LoginService.getInstance().detachLoginObserver(changeWalletAddress);
            LoginService.getInstance().detachChainChangedObserver(onChainChange);
        }
    }, []);

    if (LoginService.getInstance()?.chainId != null) {
        return (
            <Navbar.Text>
                Wallet: {walletAddress}
                <Badge pill>{chainName}</Badge>
            </Navbar.Text>
        );
    }

    return (<Button variant="primary" onClick={LoginService.getInstance().linkAccount}>Connect Wallet</Button>);
}

export default Login;